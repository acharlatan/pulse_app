import { useInterfaceText } from "../i18n/useInterfaceText";
import { profileSnapshot } from "../services/profile-snapshot";
import { MediaControls } from "../components/media-controls";
import { LocalMedia } from "../components/local-media";
import { FocusButton } from "../components/focus";
import { CustomFields } from "../components/custom-fields";
import { CommunicationHandoff } from "../components/communication";
import { outreachReasons } from "../ai/context";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { OpportunityBrief } from "./OpportunityBrief";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarPlus,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { usePulse } from "../app/context";
import {
  Avatar,
  Badge,
  Confirm,
  Empty,
  SectionHeading,
  useFormat,
} from "../components/ui";
import {
  RelationshipTimeline,
  TaskRow,
  OpportunityCard,
  PermissionsPanel,
  HealthSummary,
} from "../components/relationship";
import { EditorModal, type Editor } from "../components/forms";
import { deleteContact, deleteOrganization } from "../data/repository";
import {
  eligible,
  effectiveAvailability,
  lastInteraction,
  taskState,
} from "../services/recommendations";
export function Profile({ company = false }: { company?: boolean }) {
  const __pulseText = useInterfaceText();
  const location = useLocation();
  const returnPath = location.state?.networkReturn;
  const reviewReturn = location.state?.reviewReturn;
  const rawFocusReturn = location.state?.focusReturn;
  const focusReturn = typeof rawFocusReturn === "string" && /^\/focus(?:\?view=(today|ahead|saved|completed))?$/.test(rawFocusReturn) ? rawFocusReturn : null;
  const canReturnReview =
    typeof reviewReturn === "string" && /^\/review(?:\?|$)/.test(reviewReturn);
  const { id } = useParams();
  const p = usePulse();
  const navigate = useNavigate();
  const transitions = useLiveQuery(() => p.db.transitions.toArray(), [p.db]) || [];
  const [briefId, setBriefId] = useState<string | null>(null);
  const { date } = useFormat();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const contact = company ? undefined : p.contacts.find((c) => c.id === id);
  const org = p.organizations.find(
    (o) => o.id === (company ? id : contact?.organizationId),
  );
  const record = company ? org : contact;
  if (!record)
    return (
      <div className="page">
        <Link to="/network" className="text-link">
          <ArrowLeft size={16} />
          {__pulseText("Back to network")}</Link>
        <Empty
          title={__pulseText("This connection isn't here")}
          body={__pulseText("It may have been deleted. Your other relationships are safe.")}
        />
      </div>
    );
  const interactions = p.interactions.filter((i) =>
    company ? i.organizationId === id : i.contactId === id,
  );
  const tasks = p.tasks.filter((t) =>
    company ? t.organizationId === id : t.contactId === id,
  );
  const opportunities = p.opportunities.filter((o) =>
    company ? o.organizationId === id : o.contactIds.includes(id!),
  );
  const snapshot = profileSnapshot(interactions, tasks, opportunities);
  const last = snapshot.lastConversation?.occurredAt;
  const next = snapshot.nextTask;
  const peopleAtCompany = company ? p.contacts.filter((c) => c.organizationId === id) : [];
  const scrollTo = (target: string) => document.getElementById(target)?.scrollIntoView({
    behavior: p.settings.reducedMotion ? "instant" : "smooth", block: "start",
  });
  return (
    <div className="page profile-page editorial-profile">
      <Link
        to={
          focusReturn || (canReturnReview
            ? reviewReturn
            : typeof returnPath === "string" &&
                /^\/network(?:\?|$)/.test(returnPath)
              ? returnPath
              : "/network")
        }
        className="text-link back-link"
      >
        <ArrowLeft size={16} />
        {focusReturn ? __pulseText("Back to My Focus") : canReturnReview ? __pulseText("Back to review") : __pulseText("Back to your network")}
      </Link>
      <section
        className={`surface profile-header ${record.coverMediaId ? "has-cover" : "without-cover"}`}
      >
        <div className="profile-cover">
          {record.coverMediaId ? (
            <LocalMedia
              id={record.coverMediaId}
              className="profile-cover-image"
              alt={__pulseText("Profile cover")}
            />
          ) : (
            <div />
          )}
          <span>{__pulseText("EVERY RELATIONSHIP HAS A STORY.")}</span>
        </div>
        <div className="profile-identity">
          <Avatar
            mediaId={record.avatar}
            name={record.name}
            size="xl"
            company={company}
          />
          <div className="profile-heading-actions">
            <MediaControls
              owner={company ? "organization" : "contact"}
              id={record.id}
            />
            <button
              className="button secondary"
              onClick={() =>
                setEditor(
                  company
                    ? { kind: "company", record: org! }
                    : { kind: "contact", record: contact! },
                )
              }
            >
              <Pencil size={16} />
              {__pulseText("Edit profile")}</button>
            <button
              className="icon-button destructive"
              aria-label={__pulseText("Delete {0}", company ? "company" : "contact")}
              onClick={() => setDeleting(true)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
        <div className="profile-header-content">
          <div>
            <h1>{record.name}</h1>
            {contact?.preferredName &&
              contact.preferredName !== contact.name && (
                <p className="muted">{__pulseText("Goes by") + " "}{contact.preferredName}</p>
              )}
            <p className="profile-subtitle">
              {company ? org?.industry : contact?.role || __pulseText("A new connection")}
              {!company && org && (
                <>
                  {" "}
                  {__pulseText("at")}{" "}
                  <Link to={`/network/companies/${org.id}`}>
                    {org.name}
                    <ArrowUpRight size={14} />
                  </Link>
                </>
              )}
            </p>
            <div className="profile-badges">
              {contact && (
                <>
                  <Badge>{contact.category}</Badge>
                  <Badge tone="purple">{contact.stage}</Badge>
                  <Badge tone="amber">{contact.priority} {" " + __pulseText("priority")}</Badge>
                  <Badge
                    tone={
                      eligible(contact, p.permissions, p.restrictions)
                        ? "green"
                        : "red"
                    }
                  >
                    {contact.availability === "Available" &&
                    !eligible(contact, p.permissions, p.restrictions)
                      ? __pulseText("Outreach restricted")
                      : contact.availability === "Temporarily unavailable" &&
                          eligible(contact, p.permissions, p.restrictions)
                        ? __pulseText("Timeout expired · review")
                        : contact.availability}
                    {contact.timeoutUntil
                      ? ` · until ${date(contact.timeoutUntil)}`
                      : ""}
                  </Badge>
                </>
              )}
              {record.tags.map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </div>
          <div className="profile-actions">
            {contact ? (
              <>
                <button
                  className="button primary"
                  onClick={() => setEditor({ kind: "interaction", contact })}
                >
                  <MessageCircle size={17} />
                  {__pulseText("Log interaction")}</button>
                <button
                  className="button secondary"
                  onClick={() =>
                    setEditor({ kind: "interaction", contact, note: true })
                  }
                >
                  <StickyNote size={17} />
                  {__pulseText("Add note")}</button>
                <button
                  className="button secondary"
                  onClick={() => setEditor({ kind: "task", contact })}
                >
                  <CalendarPlus size={17} />
                  {__pulseText("Follow up")}</button>
              </>
            ) : (
              <>
                <button
                  className="button secondary"
                  onClick={() =>
                    setEditor({ kind: "interaction", organizationId: id })
                  }
                >
                  {__pulseText("Log interaction")}</button>
                <button
                  className="button secondary"
                  onClick={() =>
                    setEditor({ kind: "task", organizationId: id })
                  }
                >
                  {__pulseText("Follow up")}</button>
                <button
                  className="button primary"
                  onClick={() =>
                    setEditor({ kind: "contact", organizationId: id })
                  }
                >
                  <Plus size={17} />
                  {__pulseText("Add representative")}</button>
              </>
            )}
            <button
              className="button secondary"
              onClick={() =>
                setEditor({
                  kind: "opportunity",
                  contact: company ? undefined : contact,
                  organizationId: org?.id,
                })
              }
            >
              {__pulseText("Create opportunity")}</button>
          </div>
          <details className="profile-secondary">
            <summary>{__pulseText("More relationship tools")}</summary>
            <div className="record-actions">
              <Link
                className="button secondary"
                to={`/assistant?scope=${company ? "organization" : "contact"}&id=${encodeURIComponent(id!)}`}
              >
                {__pulseText("Catch Me Up · optional AI")}</Link>
              {contact && !company && (
                <CommunicationHandoff contact={contact} />
              )}
            </div>
          </details>
        </div>
      </section>
      <section className="profile-story-snapshot" aria-label={__pulseText("Relationship overview")}>
        <div className="snapshot-story">
          <p className="eyebrow">{__pulseText("THE STORY SO FAR")}</p>
          <h2>{__pulseText("The details that bring you back.")}</h2>
          {snapshot.lastConversation ? <div className="snapshot-conversation">
            <span>{__pulseText("LAST CONVERSATION")} · {date(snapshot.lastConversation.occurredAt)} · {__pulseText(snapshot.lastConversation.type)}</span>
            <p>{snapshot.lastConversation.summary}</p>
            <button className="snapshot-link" onClick={() => setEditor({kind:"interaction",record:snapshot.lastConversation})}>{__pulseText("Review conversation")} <ArrowUpRight size={16}/></button>
          </div> : <div className="snapshot-conversation snapshot-empty">
            <span>{__pulseText("LAST CONVERSATION")}</span>
            <p>{__pulseText("No conversation recorded yet")}</p>
            <button className="snapshot-link" onClick={() => setEditor({kind:"interaction",contact,organizationId:company ? id : undefined})}>{__pulseText("Log a conversation")} <ArrowUpRight size={16}/></button>
          </div>}
          {company && <small className="snapshot-caption">{__pulseText("Company activity uses the company saved on each conversation.")}</small>}
        </div>
        <div className="snapshot-next">
          <p className="eyebrow">{__pulseText("YOUR NEXT STEP")}</p>
          {next ? <><h3>{next.title}</h3><p>{__pulseText(taskState(next,p.settings.timezone))} · {__pulseText("Due")} {date(next.dueAt)}</p><button className="button secondary" onClick={() => setEditor({kind:"task",record:next})}>{__pulseText("Review follow-up")} <ArrowUpRight size={16}/></button></> : <><h3>{__pulseText("Room for a next step.")}</h3><p>{__pulseText("No open follow-up")}</p><button className="button secondary" onClick={() => setEditor({kind:"task",contact,organizationId:company ? id : undefined})}>{__pulseText("Plan a follow-up")} <ArrowUpRight size={16}/></button></>}
          <div className="snapshot-facts">
            <button onClick={() => scrollTo("next-steps")}><strong>{snapshot.openTasks}</strong><span>{__pulseText("open follow-ups")}</span></button>
            <button onClick={() => scrollTo("opportunities")}><strong>{snapshot.openOpportunities.length}</strong><span>{__pulseText("open opportunities")}</span></button>
          </div>
          <button className="snapshot-note" onClick={() => snapshot.lastNote ? setEditor({kind:"interaction",record:snapshot.lastNote}) : setEditor({kind:"interaction",contact,organizationId:company ? id : undefined,note:true})}>
            <StickyNote size={16}/><span>{snapshot.lastNote ? `${__pulseText("Latest note")} · ${date(snapshot.lastNote.occurredAt)}` : __pulseText("Add a note")}</span><ArrowUpRight size={15}/>
          </button>
        </div>
      </section>
      {company && org && <section className="company-world" aria-label={__pulseText("People and opportunities at this company")}>
        <div className="company-world-heading"><div><p className="eyebrow">{__pulseText("THE COMPANY CONNECTIONS")}</p><h2>{__pulseText("The people and work around this company.")}</h2><p>{__pulseText("Explore the records you have linked here.")}</p></div><Link className="button secondary" to={`/orbit?company=${encodeURIComponent(org.id)}`} state={{profileReturn:`/network/companies/${encodeURIComponent(org.id)}`,networkReturn:returnPath,reviewReturn:canReturnReview ? reviewReturn : undefined,focusReturn}}>{__pulseText("Explore in Orbit")} <ArrowUpRight size={16}/></Link></div>
        <div className="company-world-grid"><div className="company-world-group"><div className="company-world-label"><strong>{__pulseText("People")}</strong><span>{peopleAtCompany.length}</span></div>
          {peopleAtCompany.slice(0,4).map(c => <Link className="company-world-person" key={c.id} to={`/network/people/${encodeURIComponent(c.id)}`} state={{networkReturn:returnPath,reviewReturn:canReturnReview ? reviewReturn : undefined,focusReturn}}><Avatar name={c.name} mediaId={c.avatar}/><span><strong>{c.name}</strong><small>{c.role || __pulseText("Person")}</small></span><ArrowUpRight size={16}/></Link>)}
          {!peopleAtCompany.length && <p className="muted">{__pulseText("No people linked yet.")}</p>}
          {peopleAtCompany.length > 4 && <button className="text-link" onClick={() => scrollTo("people")}>{__pulseText("See all people")} <ArrowUpRight size={15}/></button>}
        </div><div className="company-world-group"><div className="company-world-label"><strong>{__pulseText("Open opportunities")}</strong><span>{snapshot.openOpportunities.length}</span></div>
          {snapshot.openOpportunities.slice(0,3).map(o => <button className="company-world-deal" key={o.id} onClick={() => setBriefId(o.id)}><span><strong>{o.title}</strong><small>{p.pipelineStages.find(stage => stage.id === o.stageId)?.name || __pulseText("Stage")}</small></span><ArrowUpRight size={16}/></button>)}
          {!snapshot.openOpportunities.length && <p className="muted">{__pulseText("No open opportunities linked yet.")}</p>}
          {opportunities.length > 0 && <button className="text-link" onClick={() => scrollTo("opportunities")}>{__pulseText("See all opportunities")} <ArrowUpRight size={15}/></button>}
        </div></div>
      </section>}
      <div className="profile-quick-links connected-profile-tools">
        <FocusButton
          type={company ? "organization" : "contact"}
          id={record.id}
        />
        <Link
          className="button ghost"
          aria-label={__pulseText("View relationship analytics")}
          to={`/analytics?${company ? "company" : "person"}=${encodeURIComponent(record.id)}`}
          state={{
            profileReturn: `/network/${company ? "companies" : "people"}/${encodeURIComponent(record.id)}`,
            networkReturn: returnPath,
            reviewReturn: canReturnReview ? reviewReturn : undefined,
            focusReturn,
          }}
        >
          {__pulseText("Analytics")}</Link>
        <Link
          className="button ghost"
          aria-label={__pulseText("View in Relationship Orbit")}
          to={`/orbit?${company ? "company" : "person"}=${encodeURIComponent(record.id)}`}
          state={{
            profileReturn: `/network/${company ? "companies" : "people"}/${encodeURIComponent(record.id)}`,
            networkReturn: returnPath,
            reviewReturn: canReturnReview ? reviewReturn : undefined,
            focusReturn,
          }}
        >
          {__pulseText("Orbit")}</Link>
      </div>

      {company && org && Object.keys(org.customFields).length > 0 && (
        <section className="surface">
          <h2>{__pulseText("Legacy company details")}</h2>
          {Object.entries(org.customFields).map(([k, v]) => (
            <p key={k}>
              <strong>{k}:</strong> {v}
            </p>
          ))}
        </section>
      )}
      <nav className="profile-section-nav" aria-label={__pulseText("Profile sections")}>
        {[
          "overview",
          "story",
          "next-steps",
          "opportunities",
          ...(company ? ["people"] : ["permissions"]),
        ].map((section) => (
          <button
            key={section}
            onClick={() =>
              document.getElementById(section)?.scrollIntoView({
                behavior: p.settings.reducedMotion ? "instant" : "smooth",
                block: "start",
              })
            }
          >
            {__pulseText(section === "overview" ? "Overview" : section === "story" ? "Story" : section === "next-steps" ? "Next steps" : section === "opportunities" ? "Opportunities" : section === "people" ? "People" : "Permissions")}
          </button>
        ))}
      </nav>
      <div className="profile-columns">
        <div className="profile-story">
          {company && (
            <section className="surface" id="people">
              <SectionHeading
                title={__pulseText("The people behind the company")}
                action={
                  <button
                    className="button ghost"
                    onClick={() =>
                      setEditor({ kind: "contact", organizationId: id })
                    }
                  >
                    <Plus size={16} />
                    {__pulseText("Add person")}</button>
                }
              />
              {p.contacts
                .filter((c) => c.organizationId === id)
                .map((c) => (
                  <Link
                    className="representative-row"
                    key={c.id}
                    to={`/network/people/${c.id}`}
                  >
                    <Avatar mediaId={c.avatar} name={c.name} />
                    <div>
                      <strong>{c.name}</strong>
                      <span>
                        {c.role} · {c.priority}
                      </span>
                      <small>
                        {lastInteraction(c.id, p.interactions)
                          ? `Last conversation ${date(lastInteraction(c.id, p.interactions)!)}`
                          : __pulseText("No conversations logged")}
                      </small>
                    </div>
                    <Badge tone="purple">{c.stage}</Badge>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              {!p.contacts.some((c) => c.organizationId === id) && (
                <p className="muted">
                  {__pulseText("Add your first representative to bring this company to life.")}</p>
              )}
            </section>
          )}
          <section className="surface" id="story">
            <SectionHeading
              title={__pulseText("Relationship story")}
              eyebrow={__pulseText("CONVERSATIONS & NOTES")}
              action={
                <button
                  className="button ghost"
                  onClick={() =>
                    setEditor({
                      kind: "interaction",
                      contact: company ? undefined : contact,
                      organizationId: company ? id : undefined,
                    })
                  }
                >
                  <Plus size={16} /> {" " + __pulseText("Add")}</button>
              }
            />
            <RelationshipTimeline
              interactions={interactions}
              tasks={tasks}
              opportunities={opportunities}
              transitions={transitions}
              onOpenOpportunity={setBriefId}
              onEdit={setEditor}
            />
          </section>
          <section className="surface" id="next-steps">
            <SectionHeading
              title={__pulseText("Next steps")}
              action={
                <button
                  className="button ghost"
                  onClick={() =>
                    setEditor({
                      kind: "task",
                      contact: company ? undefined : contact,
                      organizationId: company ? id : undefined,
                    })
                  }
                >
                  <Plus size={16} />
                  {__pulseText("Plan")}</button>
              }
            />
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} onEdit={setEditor} />
            ))}
            {!tasks.length && (
              <p className="muted">
                {__pulseText("A thoughtful follow-up is a great place to start.")}</p>
            )}
          </section>
        </div>
        <aside>
          <CustomFields
            type={company ? "organization" : "contact"}
            id={record.id}
          />
          <section className="surface" id="overview">
            <SectionHeading
              title={company ? __pulseText("About the company") : __pulseText("The little details")}
            />
            {company ? (
              <>
                <p className="body-copy">
                  {org?.description || __pulseText("Add a description to tell their story.")}
                </p>
                {org?.location && (
                  <p className="detail-line">
                    <MapPin size={17} />
                    {org.location}
                  </p>
                )}
                {org?.website && (
                  <a
                    className="detail-line text-link"
                    href={org.website}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ArrowUpRight size={17} />
                    {org.website}
                  </a>
                )}
              </>
            ) : (
              <>
                <div className="detail-block">
                  <span>{__pulseText("Relationship")}</span>
                  <strong>{contact?.category}</strong>
                </div>
                <div className="detail-block">
                  <span>{__pulseText("Last conversation")}</span>
                  <strong>
                    {last ? date(last) : __pulseText("No conversations logged")}
                  </strong>
                </div>
                <div className="detail-block">
                  <span>{__pulseText("Next follow-up")}</span>
                  <strong>
                    {next ? date(next!.dueAt) : __pulseText("Room for a next step")}
                  </strong>
                </div>
                {contact?.emails.map((email) => (
                  <a
                    className="detail-line"
                    key={email}
                    href={
                      contact &&
                      outreachReasons(
                        contact,
                        p.permissions,
                        p.restrictions,
                        "Email",
                        "Relationship",
                      ).length === 0
                        ? `mailto:${encodeURIComponent(email)}`
                        : undefined
                    }
                    aria-disabled={
                      contact
                        ? outreachReasons(
                            contact,
                            p.permissions,
                            p.restrictions,
                            "Email",
                            "Relationship",
                          ).length > 0
                        : true
                    }
                  >
                    <Mail size={16} />
                    {email}
                  </a>
                ))}
                {contact?.phones.map((phone) => (
                  <a
                    className="detail-line"
                    key={phone}
                    href={
                      contact &&
                      eligible(contact, p.permissions, p.restrictions)
                        ? `tel:${phone}`
                        : undefined
                    }
                    aria-disabled={
                      contact
                        ? !eligible(contact, p.permissions, p.restrictions)
                        : true
                    }
                  >
                    <Phone size={16} />
                    {phone}
                  </a>
                ))}
                {contact?.links.map((link) => (
                  <a
                    className="detail-line"
                    key={link}
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ArrowUpRight size={16} />
                    {link}
                  </a>
                ))}
                {contact?.availability !== "Available" && (
                  <p className="restriction-note">
                    {__pulseText("Outreach is restricted according to this profile. No messages are sent automatically.")}</p>
                )}
              </>
            )}
          </section>
          {contact && <HealthSummary contactId={contact.id} />}
          {contact && <PermissionsPanel contact={contact} onEdit={setEditor} />}
          <section className="surface" id="opportunities">
            <SectionHeading
              title={__pulseText("Opportunities")}
              action={
                <button
                  className="button ghost"
                  onClick={() =>
                    setEditor({
                      kind: "opportunity",
                      contact: company ? undefined : contact,
                      organizationId: org?.id,
                    })
                  }
                >
                  {__pulseText("Create")}</button>
              }
            />
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} onEdit={setEditor} />
            ))}
            {!opportunities.length && (
              <p className="muted">{__pulseText("No opportunities linked yet.")}</p>
            )}
          </section>
        </aside>
      </div>
      {briefId && <OpportunityBrief id={briefId} onClose={() => setBriefId(null)} onEdit={(next) => { setBriefId(null); setEditor(next); }} />}
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {deleting && (
        <Confirm
          title={__pulseText("Delete {0}?", record.name)}
          body={
            company
              ? __pulseText("The company will be deleted. People, interactions, tasks, opportunities, and activity are preserved and detached from this company.")
              : __pulseText("This deletes the contact and their interactions, tasks, restrictions, and activity. Linked opportunities are preserved without this person. This cannot be undone.")
          }
          onClose={() => setDeleting(false)}
          onConfirm={async () => {
            if (
              await p.run(
                () =>
                  company
                    ? deleteOrganization(p.db, id!)
                    : deleteContact(p.db, id!),
                "Record deleted",
              )
            )
              navigate("/network");
          }}
        />
      )}
    </div>
  );
}
