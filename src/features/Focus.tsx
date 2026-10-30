import { useInterfaceText } from "../i18n/useInterfaceText";
import { useTranslation } from "../i18n/useTranslation";
import { useRef, useState } from "react";
import { ArrowUpRight, BriefcaseBusiness, CalendarCheck, Plus, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { usePulse } from "../app/context";
import { calendarDay } from "../services/progress";
import { setFocus } from "../data/expansion-repository";
import { completeTask, reopenTask } from "../data/repository";
import { Avatar, Badge, Empty, useFormat } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
import { lastInteraction, restrictionReasons, taskState } from "../services/recommendations";
import { ProgressSummary } from "../components/progress";
import type { FocusItem } from "../data/expansion-models";
import { OpportunityBrief } from "./OpportunityBrief";
import { focusHorizon } from "../services/focus-horizon";
import { ContextTip } from "../components/context-tip";
import { FocusWorkbench } from "./FocusWorkbench";
export function Focus({ embedded = false }: { embedded?: boolean }) {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const location = useLocation(), navigate = useNavigate();
  const requestedView = new URLSearchParams(location.search).get("view");
  const p = usePulse(),
    day = calendarDay(Date.now(), p.settings.timezone);
  const { date, money } = useFormat();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);
  const picker = useRef<HTMLDetailsElement>(null);
  const [type, setType] = useState<FocusItem["entityType"]>("contact"),
    [id, setId] = useState(""),
    [search, setSearch] = useState(""),
    [focusSearch, setFocusSearch] = useState(""),
    [focusType, setFocusType] = useState("all");
  const records =
    type === "contact"
      ? p.contacts
      : type === "organization"
        ? p.organizations
        : type === "task"
          ? p.tasks
          : p.opportunities;

  const name = (r: { name?: string; title?: string }) =>
    r.name || r.title || "Untitled";
  const label = (f: FocusItem) => {
    const rows =
      f.entityType === "contact"
        ? p.contacts
        : f.entityType === "organization"
          ? p.organizations
          : f.entityType === "task"
            ? p.tasks
            : p.opportunities;
    return rows.find((r) => r.id === f.recordId);
  };
  const activeItems = p.focusItems.filter((f) => label(f) && (f.entityType !== "task" || !p.tasks.find((task) => task.id === f.recordId)?.completedAt));
  const horizon = focusHorizon(activeItems, day);
  const hasRecords = p.contacts.length + p.organizations.length + p.tasks.length + p.opportunities.length > 0;
  const completedCount = p.focusItems.filter((f) => f.entityType === "task" && !!p.tasks.find((task) => task.id === f.recordId)?.completedAt).length;
  const [board, setBoard] = useState<"today" | "ahead" | "saved" | "completed">(() => requestedView === "today" || requestedView === "ahead" || requestedView === "saved" || requestedView === "completed" ? requestedView : horizon.today.length ? "today" : horizon.later.length ? "saved" : horizon.ahead.length ? "ahead" : completedCount ? "completed" : "today");
  const focusReturn = `/focus?view=${board}`;
  const boardItems = board === "today" ? horizon.today : board === "ahead" ? horizon.ahead : board === "saved" ? horizon.later : p.focusItems.filter(f => f.entityType === "task" && !!p.tasks.find(task => task.id === f.recordId)?.completedAt);
  const matchesFocus = (item: FocusItem) => (focusType === "all" || item.entityType === focusType) && (!focusSearch.trim() || name(label(item) || {}).toLowerCase().includes(focusSearch.trim().toLowerCase()));
  const matchingCount = boardItems.filter(matchesFocus).length;

  const identity = (f: FocusItem) => {
    if (f.entityType === "contact") return p.contacts.find((item) => item.id === f.recordId);
    if (f.entityType === "organization") return p.organizations.find((item) => item.id === f.recordId);
    if (f.entityType === "task") {
      const item = p.tasks.find((task) => task.id === f.recordId);
      return p.contacts.find((contact) => contact.id === item?.contactId) || p.organizations.find((org) => org.id === item?.organizationId);
    }
    const item = p.opportunities.find((opportunity) => opportunity.id === f.recordId);
    return p.organizations.find((org) => org.id === item?.organizationId) || p.contacts.find((contact) => item?.contactIds.includes(contact.id));
  };
  const chosenPortraits = horizon.today.map(identity).filter((item): item is NonNullable<typeof item> => !!item).filter((item, index, all) => all.findIndex((other) => other.id === item.id) === index).slice(0, 4);
  function openPicker() {
    if (picker.current) { picker.current.open = true; picker.current.scrollIntoView({block:"center", behavior:p.settings.reducedMotion ? "instant" : "smooth"}); }
  }
  function changeBoard(view: typeof board) {
    setBoard(view);
    if (location.pathname === "/focus" && requestedView !== view) {
      const search = new URLSearchParams(location.search);
      search.set("view", view);
      navigate({pathname: location.pathname, search: `?${search.toString()}`}, {replace: true, state: location.state});
    }
  }
  function chooseBoard(view: typeof board) {
    changeBoard(view);
    requestAnimationFrame(() => document.getElementById("focus-board")?.scrollIntoView({block:"start",behavior:p.settings.reducedMotion ? "instant" : "smooth"}));
  }
  async function addToFocus(mode: "pin" | "today") {
    const existing = p.focusItems.find((item) => item.entityType === type && item.recordId === id);
    if (await p.run(() => setFocus(p.db, type, id, mode, day), mode === "pin" ? "Pinned" : "Added to today")) {
      if (picker.current) picker.current.open = false;
      chooseBoard(mode === "today" || existing?.today === day ? "today" : existing?.today && existing.today > day ? "ahead" : "saved");
    }
  }
  return (
    <div className={embedded ? "focus-page focus-embedded" : "page focus-page"}>
      <section className="focus-hero" aria-label={__pulseText("Your focus horizon")}>
        <div className="focus-hero-copy"><p className="eyebrow">{__pulseText("CHOSEN BY YOU")}</p><h1>{t("focus")}<span>.</span></h1><h2>{__pulseText("Make room for what matters.")}</h2><p>{__pulseText("Your people, opportunities and commitments, gathered in one intentional place.")}</p><button className="button focus-hero-add" onClick={openPicker}><Plus size={17}/>{__pulseText("Add a priority")}</button></div>
        <div className="focus-hero-aside"><div className="focus-hero-orbit" aria-hidden="true"><span className="focus-orbit-ring ring-one"/><span className="focus-orbit-ring ring-two"/><span className="focus-orbit-center">✳</span>{chosenPortraits.map((person,index) => <span className={`focus-orbit-avatar focus-orbit-avatar-${index}`} key={person.id}><Avatar name={person.name} mediaId={person.avatar} company={p.organizations.some((org) => org.id === person.id && org === person)}/></span>)}</div><div className="focus-hero-label"><span>{__pulseText("YOUR SPACE TO FOCUS")}</span><strong>{horizon.today.length}</strong><small>{__pulseText("chosen today")}</small></div></div>
        <div className="focus-hero-nav"><button onClick={() => chooseBoard("today")}><strong>{horizon.today.length}</strong><span>{__pulseText("Today")}</span><ArrowUpRight size={16}/></button><button onClick={() => chooseBoard("ahead")}><strong>{horizon.ahead.length}</strong><span>{__pulseText("Planned ahead")}</span><ArrowUpRight size={16}/></button><button onClick={() => chooseBoard("saved")}><strong>{horizon.later.length}</strong><span>{__pulseText("Saved for later")}</span><ArrowUpRight size={16}/></button></div>
      </section>
      {p.workspace === "demo" &&
        p.focusItems.length === 0 &&
        (p.contacts.some((item) => item.id === "contact-0") ||
          p.tasks.some((item) => item.id === "task-0") ||
          p.opportunities.length > 0) && (
          <aside className="surface demo-focus-examples">
            <div>
              <strong>{__pulseText("Example priorities")}</strong>
              <p>
                {__pulseText("Preview how your focus can look. These fictional examples are not yet pinned.")}</p>
              <div className="demo-focus-preview">
                {p.contacts.find((item) => item.id === "contact-0") && (
                  <div>
                    <Avatar
                      name={
                        p.contacts.find((item) => item.id === "contact-0")!.name
                      }
                      mediaId={
                        p.contacts.find((item) => item.id === "contact-0")!
                          .avatar
                      }
                    />
                    <span>
                      <strong>
                        {
                          p.contacts.find((item) => item.id === "contact-0")!
                            .name
                        }
                      </strong>
                      <small>{__pulseText("Example relationship")}</small>
                    </span>
                  </div>
                )}
                {p.tasks.find((item) => item.id === "task-0") && (
                  <div>
                    <span className="demo-focus-symbol">✓</span>
                    <span>
                      <strong>
                        {p.tasks.find((item) => item.id === "task-0")!.title}
                      </strong>
                      <small>{__pulseText("Example follow-up")}</small>
                    </span>
                  </div>
                )}
                {p.opportunities[0] && (
                  <div>
                    <span className="demo-focus-symbol">↗</span>
                    <span>
                      <strong>{p.opportunities[0].title}</strong>
                      <small>{__pulseText("Example opportunity")}</small>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              className="button primary"
              onClick={() =>
                void p.run(
                  () =>
                    p.db.transaction("rw", p.db.tables, async () => {
                      const contact = p.contacts.find(
                        (item) => item.id === "contact-0",
                      );
                      const task = p.tasks.find((item) => item.id === "task-0");
                      const opportunity = p.opportunities[0];
                      if (contact)
                        await setFocus(
                          p.db,
                          "contact",
                          contact.id,
                          "today",
                          day,
                        );
                      if (task) await setFocus(p.db, "task", task.id, "pin");
                      if (opportunity)
                        await setFocus(
                          p.db,
                          "opportunity",
                          opportunity.id,
                          "pin",
                        );
                    }),
                  "Demo priorities added",
                )
              }
            >
              {__pulseText("Add example priorities")}</button>
          </aside>
        )}
      <FocusWorkbench today={horizon.today} focusReturn={focusReturn} onAdd={openPicker} onEdit={setEditor} onOpportunity={setBriefId} />
      <div id="focus-board" className="focus-board-heading"><div><p className="eyebrow">{__pulseText("YOUR PRIORITIES, YOUR PACE")}</p><h2>{__pulseText("A little more room to move.")}</h2><p>{__pulseText("Choose where to spend your attention. Your saved records stay yours to manage.")}</p></div><Link className="button secondary" to="/analytics" state={{focusReturn}}>{__pulseText("Explore Analytics")} <ArrowUpRight size={16}/></Link></div>
      <nav className="focus-board-tabs" aria-label={__pulseText("Focus views")}>
        {([["today","Today",horizon.today.length],["ahead","Planned ahead",horizon.ahead.length],["saved","Saved for later",horizon.later.length],["completed","Recently completed",completedCount]] as const).map(([view,label,count]) => <button key={view} aria-pressed={board === view} onClick={() => changeBoard(view)}><span>{__pulseText(label)}</span><strong>{count}</strong></button>)}
      </nav>
      {activeItems.length + completedCount > 0 && <div className="focus-board-controls"><label><span>{__pulseText("Search priorities")}</span><input value={focusSearch} placeholder={__pulseText("Find a saved priority")} onChange={e=>setFocusSearch(e.target.value)}/></label><label><span>{__pulseText("Show")}</span><select value={focusType} onChange={e=>setFocusType(e.target.value)}><option value="all">{__pulseText("All types")}</option><option value="contact">{__pulseText("People")}</option><option value="organization">{__pulseText("Companies")}</option><option value="opportunity">{__pulseText("Opportunities")}</option><option value="task">{__pulseText("Follow-ups")}</option></select></label>{(focusSearch || focusType !== "all") && <button className="button ghost" onClick={()=>{setFocusSearch("");setFocusType("all");}}>{__pulseText("Clear filters")}</button>}<small>{__pulseText("{0} matching priorities",matchingCount)}</small></div>}
      {board !== "today" && boardItems.length > 0 && matchingCount === 0 && <div className="focus-filter-empty"><p>{__pulseText("No priorities match these filters.")}</p><button className="button secondary" onClick={()=>{setFocusSearch("");setFocusType("all");}}>{__pulseText("Clear filters")}</button></div>}
      {board !== "today" && (board === "ahead" ? horizon.ahead.length === 0 : board === "saved" ? horizon.later.length === 0 : completedCount === 0) && <section className="focus-board-empty"><Empty title={__pulseText(board === "ahead" ? "Nothing planned ahead yet" : board === "saved" ? "Nothing saved for later yet" : "No completed priorities yet")} body={__pulseText(board === "ahead" ? "Choose a date for a saved priority to see it here." : board === "saved" ? "Pin a person, company, opportunity or follow-up to keep it close." : "Completed follow-ups you pinned will appear here.")} action={board !== "completed" ? <button className="button secondary" onClick={openPicker}>{__pulseText("Add a priority")}</button> : undefined}/></section>}
      {(
        [
          "Today",
          "Planned ahead",
          "Pinned relationships",
          "Opportunities in focus",
          "Next actions",
          "Recently completed",
        ] as const
      ).map((section) => {
        const visible = board === "today" ? section === "Today" : board === "ahead" ? section === "Planned ahead" : board === "completed" ? section === "Recently completed" : ["Pinned relationships", "Opportunities in focus", "Next actions"].includes(section);
        if (!visible) return null;
        const items = p.focusItems.filter((f) => {
          const r = label(f);
          if (!r || !matchesFocus(f)) return false;
          const done =
            f.entityType === "task" &&
            p.tasks.find((t) => t.id === f.recordId)?.completedAt;
          return section === "Today"
            ? f.today === day && !done
            : section === "Recently completed"
              ? !!done
              : section === "Planned ahead"
                ? !!f.today && f.today > day && !done
              : f.today && f.today >= day
                ? false
                : section === "Pinned relationships"
                  ? ["contact", "organization"].includes(f.entityType)
                  : section === "Opportunities in focus"
                    ? f.entityType === "opportunity"
                    : f.entityType === "task" && !done;
        });
        if (section === "Planned ahead") items.sort((a, b) => (a.today || "").localeCompare(b.today || "") || a.id.localeCompare(b.id));
        if (!items.length && section !== "Today") return null;
        return (
          <section
            className={`surface focus-collection ${section === "Today" ? "focus-today" : ""}`}
            key={section}
          >
            <div className="focus-collection-heading"><div><p className="eyebrow">{section === "Today" ? __pulseText("YOUR CHOSEN WORK") : section === "Planned ahead" ? __pulseText("YOUR UPCOMING PRIORITIES") : section === "Recently completed" ? __pulseText("COMPLETED WORK") : __pulseText("SAVED FOR LATER")}</p><h2>{__pulseText(section)}</h2></div><span>{items.length}</span></div>
            {section === "Today" && <p className="focus-collection-description">{__pulseText("Your selected priorities for today. Pinned records stay saved until you remove them.")}</p>}
            {!items.length && (
              <Empty
                title={__pulseText(horizon.today.length ? "No priorities match these filters." : "Give today a little direction.")}
                body={__pulseText(horizon.today.length ? "Try another search or clear your filters." : hasRecords ? "Open Add a priority to choose a person, company, opportunity or follow-up. Find your other pins in Saved for later." : "Add a person or company to your workspace, then choose what belongs in your focus.")}
                action={horizon.today.length ? <button className="button secondary" onClick={()=>{setFocusSearch("");setFocusType("all");}}>{__pulseText("Clear filters")}</button> : hasRecords ? <button className="button secondary" onClick={openPicker}>{__pulseText("Add a priority")}</button> : <Link className="button secondary" to="/network">{__pulseText("Open Network")}</Link>}
              />
            )}
            {items.slice(0, 100).map((f) => {
              const linked = identity(f);
              const isCompany = !!linked && p.organizations.some((org) => org === linked);
              const isDone = f.entityType === "task" && !!p.tasks.find((task) => task.id === f.recordId)?.completedAt;
              return <article className={`focus-row focus-kind-${f.entityType}`} key={f.id}>
                <div>
                  <div className="focus-record-identity">
                    {linked ? <Avatar name={linked.name} mediaId={linked.avatar} company={isCompany} size="large"/> : <span className="focus-record-symbol" aria-hidden="true">{f.entityType === "task" ? <CalendarCheck size={23}/> : <BriefcaseBusiness size={23}/>}</span>}
                    <div><span className="focus-kind-label">{__pulseText(f.entityType === "contact" ? "Person" : f.entityType === "organization" ? "Company" : f.entityType === "task" ? "Follow-up" : "Opportunity")}</span><strong>{name(label(f)!)}</strong>{linked && f.entityType !== "contact" && f.entityType !== "organization" && <Link className="focus-linked-person" to={`/network/${isCompany ? "companies" : "people"}/${encodeURIComponent(linked.id)}`} state={{focusReturn}}>{linked.name} <ArrowUpRight size={13}/></Link>}</div>
                  </div>
                  {f.entityType === "opportunity" &&
                    (() => {
                      const o = p.opportunities.find(
                        (o) => o.id === f.recordId,
                      )!;
                      return (
                        <p className="focus-deal-context">
                          <strong>
                            {o.value === null
                              ? __pulseText("Value not set")
                              : money(o.value, o.currency)}
                          </strong>
                          <Badge tone="purple">
                            {p.pipelineStages.find((s) => s.id === o.stageId)
                              ?.name || __pulseText("Stage")}{" "}
                            · {__pulseText(o.status)}
                          </Badge>
                          {p.intelligence.opportunities.find((i) => i.opportunityId === o.id)?.flags.length ? <span className="focus-context-evidence">{p.intelligence.opportunities.find((i) => i.opportunityId === o.id)?.reason}</span> : null}
                        </p>
                      );
                    })()}
                  {f.entityType === "task" &&
                    (() => {
                      const t = p.tasks.find((t) => t.id === f.recordId)!;
                      const contact = p.contacts.find((item) => item.id === t.contactId);
                      const restricted = contact && restrictionReasons(contact, p.permissions, p.restrictions).length > 0;
                      return (
                        <p className="focus-task-context">
                          {__pulseText(taskState(t, p.settings.timezone))} · {__pulseText("Due")} {date(t.dueAt)}
                          <span className="focus-context-evidence">{[contact?.name, p.organizations.find((org) => org.id === t.organizationId)?.name].filter(Boolean).join(" · ") || __pulseText("No person or company linked")}{restricted ? ` · ${__pulseText("Outreach restricted")}` : ""}{t.description ? ` · ${t.description.length > 110 ? `${t.description.slice(0,110)}…` : t.description}` : ""}</span>
                        </p>
                      );
                    })()}
                  {f.entityType === "contact" && (() => { const c = p.contacts.find((item) => item.id === f.recordId)!; const last = lastInteraction(c.id, p.interactions); const org = p.organizations.find((item) => item.id === c.organizationId); const restricted = restrictionReasons(c,p.permissions,p.restrictions).length > 0; return <p className="focus-context-evidence">{[c.role, org?.name].filter(Boolean).join(" · ")}{(c.role || org) ? " · " : ""}{last ? `${__pulseText("Last conversation")} ${date(last)}` : __pulseText("No conversation recorded")}{restricted ? ` · ${__pulseText("Outreach restricted")}` : ""}</p>; })()}
                  {f.entityType === "organization" && (() => { const count = p.contacts.filter((c) => c.organizationId === f.recordId).length; return <p className="focus-context-evidence">{count} {__pulseText("saved people at this company")}</p>; })()}
                  <p className="muted">
                    {__pulseText("Pinned")}{" "}
                    {f.today === day
                      ? __pulseText("· Selected today")
                      : f.today
                        ? `· ${__pulseText("Selected")} ${f.today}`
                        : ""}
                  </p>
                  {f.entityType === "contact" ||
                  f.entityType === "organization" ? (
                    <Link
                      to={`/network/${f.entityType === "contact" ? "people" : "companies"}/${encodeURIComponent(f.recordId)}`}
                      state={{focusReturn}}
                    >
                      {__pulseText("Open relationship")}</Link>
                  ) : (
                    <Link
                      to={
                        f.entityType === "task"
                          ? `/activity?filter=${p.tasks.find((t) => t.id === f.recordId)?.completedAt ? "complete" : "open"}`
                          : "/pipeline"
                      }
                    >
                      {f.entityType === "task" ? __pulseText("View follow-ups") : __pulseText("View pipeline")}
                    </Link>
                  )}
                </div>
                <div className="form-actions">
                  {f.entityType === "opportunity" && <button className="button secondary" onClick={() => setBriefId(f.recordId)}>{__pulseText("Review opportunity")} <ArrowUpRight size={15}/></button>}
                  {f.entityType === "task" && <button className="button secondary" onClick={() => {const record = p.tasks.find((task) => task.id === f.recordId); if (record) setEditor({kind:"task",record});}}>{__pulseText("Review follow-up")} <ArrowUpRight size={15}/></button>}
                  {!isDone && <button
                    className="button ghost"
                    onClick={async () => {
                      const wasToday = f.today === day;
                      const saved = await p.run(
                        () =>
                          setFocus(
                            p.db,
                            f.entityType,
                            f.recordId,
                            f.today === day ? "removeToday" : "today",
                            day,
                          ),
                        "Focus updated",
                      );
                      if (saved && !wasToday) changeBoard("today");
                    }}
                  >
                    {f.today === day ? __pulseText("Remove from today") : __pulseText("Choose today")}
                  </button>}
                  <button
                    className="button ghost"
                    onClick={() =>
                      void p.run(
                        () => setFocus(p.db, f.entityType, f.recordId, "unpin"),
                        "Unpinned",
                      )
                    }
                  >
                    {__pulseText("Unpin")}</button>
                  {f.entityType === "task" &&
                    !p.tasks.find((t) => t.id === f.recordId)?.completedAt && (
                      <button
                        className="button primary"
                        onClick={() =>
                          void p.run(
                            () => completeTask(p.db, f.recordId),
                            "Follow-up completed",
                          )
                        }
                      >
                        {__pulseText("Complete task")}</button>
                    )}
                  {isDone && <button className="button secondary" onClick={async () => {if (await p.run(() => reopenTask(p.db, f.recordId), "Follow-up reopened")) changeBoard(f.today === day ? "today" : f.today && f.today > day ? "ahead" : "saved");}}>{__pulseText("Reopen")}</button>}
                </div>
                {!isDone && <details className="focus-move-date"><summary><Sparkles size={14}/>{__pulseText("Choose another day")}</summary><form onSubmit={async (e) => {e.preventDefault(); const chosen = String(new FormData(e.currentTarget).get("focusDate") || ""); if (chosen && await p.run(() => setFocus(p.db, f.entityType, f.recordId, "today", chosen), "Focus updated")) changeBoard(chosen === day ? "today" : "ahead");}}><label><span>{__pulseText("Focus date")}</span><input name="focusDate" type="date" min={day} required/></label><button className="button secondary">{__pulseText("Save date")}</button></form><small>{__pulseText("This changes your focus date, not the follow-up due date.")}</small></details>}
              </article>;
            })}
          </section>
        );
      })}
      <details ref={picker} className="surface focus-picker">
        <summary>{__pulseText("Add a priority")}</summary>
        <div className="form-grid">
          <label className="field">
            <span>{__pulseText("Record type")}</span>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value as typeof type);
                setId("");
              }}
            >
              <option value="contact">{__pulseText("Person")}</option>
              <option value="organization">{__pulseText("Company")}</option>
              <option value="opportunity">{__pulseText("Opportunity")}</option>
              <option value="task">{__pulseText("Follow-up")}</option>
            </select>
          </label>
          <label className="field">
            <span>{__pulseText("Search records")}</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <label className="field">
            <span>{__pulseText("Record")}</span>
            <select
              aria-label={__pulseText("Focus record")}
              value={id}
              onChange={(e) => setId(e.target.value)}
            >
              <option value="">{__pulseText("Choose a record")}</option>
              {records
                .filter((r) =>
                  name(r).toLowerCase().includes(search.toLowerCase()),
                )
                .slice(0, 100)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {name(r)}
                  </option>
                ))}
            </select>
            <small>{__pulseText("Search to narrow the first 100 matches.")}</small>
          </label>
        </div>
        <div className="form-actions">
          <button
            className="button secondary"
            disabled={!id}
            onClick={() => void addToFocus("pin")}
          >
            {__pulseText("Pin record")}</button>
          <button
            className="button primary"
            disabled={!id}
            onClick={() => void addToFocus("today")}
          >
            {__pulseText("Add to today")}</button>
        </div>
        <p className="muted">
          {__pulseText("Up to 100 pins and 20 daily priorities. Pins stay until removed; daily selections remain on their chosen date. Removing a priority does not reschedule its task.")}</p>
      </details>
      <ContextTip title="Make space for what matters" >Pin people, companies, follow-ups or opportunities to save them for later. Choose a few for today; completing a follow-up is always your choice.</ContextTip>
      {briefId && <OpportunityBrief id={briefId} onClose={() => setBriefId(null)} onEdit={(next) => {setBriefId(null); setEditor(next);}} />}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {p.settings.focus.progress && p.settings.gamification && (
        <ProgressSummary />
      )}
    </div>
  );
}
