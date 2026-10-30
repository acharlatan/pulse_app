import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowUpRight, Plus } from "lucide-react";
import { usePulse } from "../app/context";
import { Avatar, useFormat } from "../components/ui";
import { GettingStarted } from "../components/GettingStarted";
import { ProgressSummary } from "../components/progress";
import { EditorModal, type Editor } from "../components/forms";
import { DailyPlan } from "./DailyPlan";
import { Focus } from "./Focus";
import { ConstellationScene } from "../components/ConstellationScene";
export function Home({ focus = false }: { focus?: boolean }) {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const p = usePulse(),
    { date } = useFormat(),
    navigate = useNavigate();
  const [editor, setEditor] = useState<Editor | null>(null);
  const reminders =
    useLiveQuery(
      () =>
        p.db.automationExecutions
          .orderBy("at")
          .reverse()
          .filter((e) => e.action === "reminder" && e.status === "completed")
          .limit(5)
          .toArray(),
      [p.db],
    ) || [];
  useEffect(() => {
    if (p.settings.focus.landing !== "focus") return;
    try {
      const key = `pulse-home-visited:${p.workspace}`;
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        navigate("/focus", { replace: true });
      }
    } catch {
      /* Optional session hint only. */
    }
  }, [navigate, p.workspace, p.settings.focus.landing]);
  const pins = p.focusItems
    .filter((f) => ["contact", "organization"].includes(f.entityType))
    .slice(0, 5);
  const active =
    p.contacts.length ||
    p.organizations.length ||
    p.opportunities.length ||
    p.tasks.length;
  const upcoming = p.tasks.filter((item) => !item.completedAt).sort((a,b) => a.dueAt.localeCompare(b.dueAt)).slice(0,3);
  const recentPeople = [...p.contacts].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0,3);
  const todayTabs = <nav className="today-view-tabs" aria-label={__pulseText("Today views")}><Link to="/" aria-current={!focus ? "page" : undefined} className={!focus ? "active" : ""}>{t("dailyPulse")}</Link><Link to="/focus" aria-current={focus ? "page" : undefined} className={focus ? "active" : ""}>{t("focus")}</Link></nav>;
  if (focus) return <div className="page home-page editorial-home daily-home today-focus-page">{todayTabs}<Focus embedded /></div>;
  return (
    <div
      className={`page home-page editorial-home daily-home home-${p.settings.focus.homeLayout}`}
    >
      {todayTabs}
      <div className="home-feature">
        <header className="editorial-masthead">
          <div>
            <p className="eyebrow">
              {date(new Date().toISOString(), {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}{" "}
              {__pulseText("· DAILY PULSE")}</p>
            <h1>
              {t("today")}<span className="accent">.</span>
            </h1>
            <p className="editorial-deck">
              {p.settings.name ? `${t("hello")}, ${p.settings.name}. ` : ""}{t("homeIntro")}
            </p>
          </div>
          <div className="editorial-create">
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "contact" })}
            >
              <Plus size={17} />
              {t("newConnection")}
            </button>
            <button
              className="button ghost"
              onClick={() => setEditor({ kind: "task" })}
            >
              {t("planFollowup")}
            </button>
          </div>
        </header>

        <section className="pulse-opening" aria-label={__pulseText("Your relationship workspace")}>
          <div className="pulse-opening-copy">
            <span className="pulse-opening-label"><span className="opening-spark">✳</span> {" " + __pulseText("YOUR SPACE · YOUR PACE")}</span>
            <h2>{t("hero1")}<br /><em>{t("hero2")}</em><span>.</span></h2>
            <p>{t("heroCopy")}</p>
            <div className="opening-actions"><Link className="pulse-opening-link" to="/network">{t("exploreNetwork")} <ArrowUpRight size={17} /></Link><Link className="opening-orbit-link" to="/orbit">{t("enterOrbit")} ↗</Link></div>
            {p.contacts.length > 0 && <div className="opening-people"><div className="opening-avatar-stack">{p.contacts.slice(0, 5).map((person) => <Avatar key={person.id} name={person.name} mediaId={person.avatar} />)}</div><span><strong>{p.contacts.length} {p.contacts.length === 1 ? __pulseText("person") : __pulseText("people")}</strong> {" " + __pulseText("in your world")}</span></div>}
          </div>
          <div className="opening-art">
            <div className="opening-art-fallback" aria-hidden="true" />
            <ConstellationScene variant="home" />
            <div className="opening-portrait-links">
              {p.contacts.slice(0, 3).map((person) => (
                <Link className="opening-portrait" key={person.id} to={`/network/people/${person.id}`}>
                  <Avatar name={person.name} mediaId={person.avatar} />
                  <span><strong>{person.name}</strong><small>{person.role || __pulseText("Person")}</small></span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </Link>
              ))}
            </div>
            <span className="opening-art-caption" aria-hidden="true">{__pulseText("A WORLD OF CONNECTIONS") + " "}<b>✳</b></span>
          </div>
        </section>
      </div>

      {p.workspace === "personal" &&
        p.contacts.length +
          p.organizations.length +
          p.tasks.length +
          p.opportunities.length >
          0 &&
        (() => {
          const last = p.settings.onboarding.exportInitiatedAt;
          const stale = !last || Date.now() - Date.parse(last) >= 30 * 86400000;
          return stale ? (
            <aside className="backup-nudge" aria-label={__pulseText("Backup reminder")}>
              <div>
                <strong>{__pulseText("Keep a copy of your work.")}</strong>
                <p>
                  {last
                    ? `Last backup download requested ${date(last)}.`
                    : __pulseText("No backup download has been requested yet.")}{" "}
                  {__pulseText("Records live in this browser. Check your downloaded file and keep it somewhere safe.")}</p>
              </div>
              <Link className="button secondary" to="/settings?section=data">
                {__pulseText("Review backups")}</Link>
            </aside>
          ) : null;
        })()}
      <GettingStarted />
      {p.workspace === "demo" && <aside className="journey-demo-banner"><div><span>{__pulseText("EXPLORING THE DEMO")}</span><strong>{__pulseText("Get to know Pulse with a fictional network.")}</strong><p>{__pulseText("When you’re ready, start your own workspace. Both stay separate on this device.")}</p></div><button className="button journey-banner-button" onClick={() => p.switchWorkspace("personal")}>{__pulseText("Start my workspace")} <ArrowUpRight size={16}/></button></aside>}
      {p.workspace === "personal" && !!active && <section className="journey-today" aria-label={__pulseText("Your workspace today")}><div className="journey-today-heading"><div><p className="eyebrow">{__pulseText("YOUR RELATIONSHIP JOURNEY")}</p><h2>{__pulseText("Your next chapter starts here.")}</h2><p>{__pulseText("A quick look at the people and commitments you’ve saved.")}</p></div><Link className="text-link" to="/focus">{__pulseText("Choose today’s focus")} <ArrowUpRight size={16}/></Link></div><div className="journey-today-grid"><article><span className="eyebrow">{__pulseText("YOUR NEXT COMMITMENTS")}</span>{upcoming.length ? upcoming.map((task)=><button key={task.id} onClick={()=>setEditor({kind:"task",record:task})}><span><strong>{task.title}</strong><small>{date(task.dueAt)} · {p.contacts.find(c=>c.id===task.contactId)?.name || p.organizations.find(o=>o.id===task.organizationId)?.name || __pulseText("No person or company linked")}</small></span><ArrowUpRight size={16}/></button>) : <p>{__pulseText("No open follow-ups yet. Plan one when you’re ready.")}</p>}<button className="text-link" onClick={()=>setEditor({kind:"task"})}>{__pulseText("Plan a follow-up")}</button></article><article><span className="eyebrow">{__pulseText("RECENTLY ADDED PEOPLE")}</span>{recentPeople.length ? recentPeople.map((c)=><Link key={c.id} to={`/network/people/${c.id}`}><Avatar name={c.name} mediaId={c.avatar}/><span><strong>{c.name}</strong><small>{c.role || __pulseText("Person")}</small></span><ArrowUpRight size={16}/></Link>) : <p>{__pulseText("Add a person to start building your network.")}</p>}<Link className="text-link" to="/network">{__pulseText("Open your network")}</Link></article></div></section>}
      {p.workspace === "demo" && <details className="demo-quickstart"><summary>{__pulseText("New to PULSE? Take a quick tour")}</summary><div className="demo-quickstart-content"><p>{__pulseText("Try these steps with fictional records. Your demo edits stay in this browser and are separate from your personal workspace.")}</p><div><button className="button secondary" onClick={() => setEditor({ kind: "contact" })}>{__pulseText("1 · Add a person")}</button><Link className="button secondary" to="/network">{__pulseText("2 · Open a profile & log a conversation")}</Link><button className="button secondary" onClick={() => setEditor({ kind: "task" })}>{__pulseText("3 · Plan a follow-up")}</button></div></div></details>}
      {active ? (
        <>
          <DailyPlan onEdit={setEditor} />
          <section className="editorial-people">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{__pulseText("KEEP CLOSE")}</p>
                <h2>
                  {pins.length ? t("pinned") : t("yourPeople")}
                </h2>
              </div>
              <Link className="text-link" to="/network">
                {__pulseText("Open network") + " "}<ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="editorial-people-strip">
              {pins.length
                ? pins.map((f) => {
                    const c =
                      f.entityType === "contact"
                        ? p.contacts.find((c) => c.id === f.recordId)
                        : p.organizations.find((c) => c.id === f.recordId);
                    return c ? (
                      <Link
                        key={f.id}
                        to={`/network/${f.entityType === "contact" ? "people" : "companies"}/${c.id}`}
                      >
                        <Avatar name={c.name} mediaId={c.avatar} size="large" />
                        <span>
                          <strong>{c.name}</strong>
                          <small>{__pulseText("Pinned by you")}</small>
                        </span>
                      </Link>
                    ) : null;
                  })
                : p.contacts.slice(0, 4).map((c) => (
                    <Link key={c.id} to={`/network/people/${c.id}`}>
                      <Avatar name={c.name} mediaId={c.avatar} size="large" />
                      <span>
                        <strong>{c.name}</strong>
                        <small>{c.role || __pulseText("Person")}</small>
                      </span>
                    </Link>
                  ))}
            </div>
          </section>
          {reminders.length > 0 && (
            <details className="editorial-reminders">
              <summary>{__pulseText("Recent local reminders")}</summary>
              {reminders.map((r) => (
                <p key={r.id}>
                  {(r.sourceType === "contact"
                    ? p.contacts.find((c) => c.id === r.sourceId)?.name
                    : r.sourceType === "task"
                      ? p.tasks.find((t) => t.id === r.sourceId)?.title
                      : p.opportunities.find((o) => o.id === r.sourceId)
                          ?.title) || __pulseText("Record removed")}{" "}
                  · {date(r.at)}
                </p>
              ))}
              <Link to="/automations">{__pulseText("Open automation history")}</Link>
            </details>
          )}

          <ProgressSummary />
        </>
      ) : (
        <section className="daily-first-use surface">
          <p className="eyebrow">{__pulseText("YOUR FIRST USEFUL MOVE")}</p>
          <h2>{__pulseText("Start with a person. Give the next step a home.")}</h2>
          <p>
            {__pulseText("Add a real connection, a possible opportunity and a follow-up. Your Daily Pulse will take shape from what you save.")}</p>
          <div className="daily-first-steps">
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "contact" })}
            >
              {__pulseText("Add someone")}</button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "opportunity" })}
            >
              {__pulseText("Create opportunity")}</button>
            <button
              className="button secondary"
              onClick={() => setEditor({ kind: "task" })}
            >
              {t("planFollowup")}
            </button>
          </div>
          <div className="form-actions">
            <Link className="text-link" to="/import">
              {__pulseText("Import contacts")}</Link>
            <button
              className="text-link"
              onClick={() => setEditor({ kind: "company" })}
            >
              {__pulseText("Add a company")}</button>
            <Link className="text-link" to="/help">
              {__pulseText("Getting started")}</Link>
          </div>
        </section>
      )}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
    </div>
  );
}
