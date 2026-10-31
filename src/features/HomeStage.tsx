import { ArrowUpRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { ConstellationScene } from "../components/ConstellationScene";
import { Avatar, useFormat } from "../components/ui";
import type { Editor } from "../components/forms";
import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { homeStageSnapshot } from "../services/home-stage";

/** This is a view over saved records. It does not create priorities or infer connections. */
export function HomeStage({ onEdit }: { onEdit: (editor: Editor) => void }) {
  const p = usePulse();
  const t = useTranslation();
  const text = useInterfaceText();
  const { date } = useFormat();
  const now = new Date();
  const { moment, chosen, openCount, next } = homeStageSnapshot(p, p.settings.timezone, now.getTime());
  const greeting = moment === "morning" ? text("Good morning") : moment === "afternoon" ? text("Good afternoon") : text("Good evening");
  const people = p.contacts.slice(0, 3);
  return <section className="pulse-opening pulse-world-stage" data-moment={moment} aria-label={text("Your relationship workspace")}>
    <div className="world-stage-copy">
      <div className="world-stage-date"><span className="world-stage-mark" aria-hidden="true">✳</span><span>{date(now.toISOString(), { weekday: "long", month: "long", day: "numeric" })} · {t("dailyPulse")}</span></div>
      <div className="world-stage-intro">
        <h1>{t("today")}<span>.</span></h1>
        <p>{greeting}{p.settings.name ? `, ${p.settings.name}` : ""}.</p>
      </div>
      <h2>{text("Your world,")}<br/><em>{text("in motion.")}</em></h2>
      <p className="world-stage-deck">{t("heroCopy")}</p>
      <div className="world-stage-actions">
        <button type="button" onClick={() => onEdit({ kind: "contact" })}><Plus size={17} aria-hidden="true"/>{t("newConnection")}</button>
        <button type="button" onClick={() => onEdit({ kind: "task" })}>{t("planFollowup")} <ArrowUpRight size={16} aria-hidden="true"/></button>
      </div>
      <div className="world-next-line">
        <span>{text("NEXT OPEN FOLLOW-UP")}</span>
        {next ? <button type="button" onClick={() => onEdit({ kind: "task", record: next })}><strong>{next.title}</strong><small>{text("Due")} {date(next.dueAt)}</small><ArrowUpRight size={16} aria-hidden="true"/></button> : <button type="button" onClick={() => onEdit({ kind: "task" })}><strong>{text("Plan a first follow-up")}</strong><ArrowUpRight size={16} aria-hidden="true"/></button>}
      </div>
    </div>
    <div className="opening-art world-stage-art">
      <div className="opening-art-fallback world-stage-fallback" aria-hidden="true"><i/><i/><i/><b>✳</b></div>
      <div className="world-stage-art-label" aria-hidden="true"><span>✳</span> {text("A WORLD OF CONNECTIONS")}</div>
      <ConstellationScene variant="home" />
      <div className="world-stage-people" aria-label={text("People in your workspace")}>
        {people.map(person => <Link className="world-person" key={person.id} to={`/network/people/${encodeURIComponent(person.id)}`}><Avatar name={person.name} mediaId={person.avatar}/><span><strong>{person.name}</strong><small>{person.role || text("Person")}</small></span><ArrowUpRight size={15} aria-hidden="true"/></Link>)}
      </div>
      <Link className="world-stage-orbit" to="/orbit">{t("enterOrbit")} <ArrowUpRight size={16} aria-hidden="true"/></Link>
    </div>
    <nav className="world-stage-index" aria-label={text("Your workspace at a glance")}>
      <Link to="/focus"><span>01</span><div><strong>{chosen}</strong><small>{text("chosen for today")}</small></div><ArrowUpRight size={16} aria-hidden="true"/></Link>
      <Link to="/activity"><span>02</span><div><strong>{openCount}</strong><small>{text("open follow-ups")}</small></div><ArrowUpRight size={16} aria-hidden="true"/></Link>
      <Link to="/network"><span>03</span><div><strong>{p.contacts.length}</strong><small>{text("people in your world")}</small></div><ArrowUpRight size={16} aria-hidden="true"/></Link>
    </nav>
  </section>;
}
