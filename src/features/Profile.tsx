import { MediaControls } from "../components/media-controls";
import { LocalMedia } from "../components/local-media";
import { FocusButton } from "../components/focus";
import { CustomFields } from "../components/custom-fields";
import { CommunicationHandoff } from "../components/communication";
import { outreachReasons } from "../ai/context";
import { useState } from "react";
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
  lastInteraction,
  taskState,
} from "../services/recommendations";
export function Profile({ company = false }: { company?: boolean }) {
  const returnPath = useLocation().state?.networkReturn;
  const { id } = useParams();
  const p = usePulse();
  const navigate = useNavigate();
  const { date } = useFormat();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const contact = p.contacts.find((c) => c.id === id);
  const org = p.organizations.find(
    (o) => o.id === (company ? id : contact?.organizationId),
  );
  const record = company ? org : contact;
  if (!record)
    return (
      <div className="page">
        <Link to="/network" className="text-link">
          <ArrowLeft size={16} />
          Back to network
        </Link>
        <Empty
          title="This connection isn't here"
          body="It may have been deleted. Your other relationships are safe."
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
  const last = company
    ? interactions
        .filter((i) => i.type !== "Note")
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0]?.occurredAt
    : contact
      ? lastInteraction(contact.id, p.interactions)
      : undefined;
  const next = tasks
    .filter((t) => !t.completedAt)
    .sort((a, b) => a.dueAt.localeCompare(b.dueAt))[0];
  return (
    <div className="page profile-page editorial-profile">
      <Link
        to={
          typeof returnPath === "string" &&
          /^\/network(?:\?|$)/.test(returnPath)
            ? returnPath
            : "/network"
        }
        className="text-link back-link"
      >
        <ArrowLeft size={16} />
        Back to your network
      </Link>
      <section
        className={`surface profile-header ${record.coverMediaId ? "has-cover" : "without-cover"}`}
      >
        <div className="profile-cover">
          {record.coverMediaId ? (
            <LocalMedia
              id={record.coverMediaId}
              className="profile-cover-image"
              alt="Profile cover"
            />
          ) : (
            <div />
          )}
          <span>EVERY RELATIONSHIP HAS A STORY.</span>
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
              Edit profile
            </button>
            <button
              className="icon-button destructive"
              aria-label={`Delete ${company ? "company" : "contact"}`}
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
                <p className="muted">Goes by {contact.preferredName}</p>
              )}
            <p className="profile-subtitle">
              {company ? org?.industry : contact?.role || "A new connection"}
              {!company && org && (
                <>
                  {" "}
                  at{" "}
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
                  <Badge tone="amber">{contact.priority} priority</Badge>
                  <Badge
                    tone={
                      eligible(contact, p.permissions, p.restrictions)
                        ? "green"
                        : "red"
                    }
                  >
                    {contact.availability === "Available" &&
                    !eligible(contact, p.permissions, p.restrictions)
                      ? "Outreach restricted"
                      : contact.availability === "Temporarily unavailable" &&
                          eligible(contact, p.permissions, p.restrictions)
                        ? "Timeout expired · review"
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
                  Log interaction
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    setEditor({ kind: "interaction", contact, note: true })
                  }
                >
                  <StickyNote size={17} />
                  Add note
                </button>
                <button
                  className="button secondary"
                  onClick={() => setEditor({ kind: "task", contact })}
                >
                  <CalendarPlus size={17} />
                  Follow up
                </button>
              </>
            ) : (
              <>
                <button
                  className="button secondary"
                  onClick={() =>
                    setEditor({ kind: "interaction", organizationId: id })
                  }
                >
                  Log interaction
                </button>
                <button
                  className="button secondary"
                  onClick={() =>
                    setEditor({ kind: "task", organizationId: id })
                  }
                >
                  Follow up
                </button>
                <button
                  className="button primary"
                  onClick={() =>
                    setEditor({ kind: "contact", organizationId: id })
                  }
                >
                  <Plus size={17} />
                  Add representative
                </button>
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
              Create opportunity
            </button>
          </div>
          <details className="profile-secondary">
            <summary>More relationship tools</summary>
            <div className="record-actions">
              <Link
                className="button secondary"
                to={`/assistant?scope=${company ? "organization" : "contact"}&id=${encodeURIComponent(id!)}`}
              >
                Catch Me Up · optional AI
              </Link>
              {contact && !company && (
                <CommunicationHandoff contact={contact} />
              )}
            </div>
          </details>
        </div>
      </section>
      <section
        className="profile-perspective"
        aria-label="Relationship perspective"
      >
        <div>
          <p className="eyebrow">THE STORY SO FAR</p>
          <h2>Context for the next move.</h2>
          <p>
            Saved activity and commitments for this{" "}
            {company ? "company" : "person"}.
          </p>
        </div>
        <div className="profile-perspective-facts">
          <div>
            <strong>
              {
                interactions.filter(
                  (i) =>
                    i.type !== "Note" && Date.parse(i.occurredAt) <= Date.now(),
                ).length
              }
            </strong>
            <span>recorded conversations</span>
          </div>
          <div>
            <strong>{tasks.filter((t) => !t.completedAt).length}</strong>
            <span>open follow-ups</span>
          </div>
          <div>
            <strong>
              {opportunities.filter((o) => o.status === "open").length}
            </strong>
            <span>open opportunities</span>
          </div>
        </div>
        <p className="profile-perspective-note">
          {next
            ? `Next follow-up: ${next.title} · ${date(next.dueAt)}`
            : "No open follow-up is scheduled."}
        </p>
      </section>
      <div className="profile-quick-links">
        <FocusButton
          type={company ? "organization" : "contact"}
          id={record.id}
        />
        <Link
          className="button ghost"
          aria-label="View relationship analytics"
          to={`/analytics?${company ? "company" : "person"}=${encodeURIComponent(record.id)}`}
        >
          Analytics
        </Link>
        <Link
          className="button ghost"
          aria-label="View in Relationship Orbit"
          to={`/orbit?${company ? "company" : "person"}=${record.id}`}
        >
          Orbit
        </Link>
      </div>

      {company && org && Object.keys(org.customFields).length > 0 && (
        <section className="surface">
          <h2>Legacy company details</h2>
          {Object.entries(org.customFields).map(([k, v]) => (
            <p key={k}>
              <strong>{k}:</strong> {v}
            </p>
          ))}
        </section>
      )}
      <nav className="profile-section-nav" aria-label="Profile sections">
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
            {section.replace("-", " ")}
          </button>
        ))}
      </nav>
      <section
        className="profile-commitment"
        aria-label="Next relationship commitment"
      >
        <div>
          <p className="eyebrow">
            {next ? "THE NEXT CHAPTER" : "LAST CONVERSATION"}
          </p>
          <h2>
            {next
              ? next.title
              : last
                ? date(last)
                : "Your story starts with a conversation."}
          </h2>
          <p className="muted">
            {next
              ? `${taskState(next, p.settings.timezone)} · Due ${date(next.dueAt)}`
              : "Conversations and notes remain in the relationship story below."}
          </p>
        </div>
        <button
          className="button secondary"
          onClick={() =>
            setEditor(
              next
                ? { kind: "task", record: next }
                : {
                    kind: "interaction",
                    contact: company ? undefined : contact,
                    organizationId: company ? id : undefined,
                  },
            )
          }
        >
          {next ? "Review commitment" : "Start the story"}
          <ArrowUpRight size={16} />
        </button>
      </section>
      <div className="profile-columns">
        <div className="profile-story">
          {company && (
            <section className="surface" id="people">
              <SectionHeading
                title="The people behind the company"
                action={
                  <button
                    className="button ghost"
                    onClick={() =>
                      setEditor({ kind: "contact", organizationId: id })
                    }
                  >
                    <Plus size={16} />
                    Add person
                  </button>
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
                          : "No conversations logged"}
                      </small>
                    </div>
                    <Badge tone="purple">{c.stage}</Badge>
                    <ArrowUpRight size={17} />
                  </Link>
                ))}
              {!p.contacts.some((c) => c.organizationId === id) && (
                <p className="muted">
                  Add your first representative to bring this company to life.
                </p>
              )}
            </section>
          )}
          <section className="surface" id="story">
            <SectionHeading
              title="Relationship story"
              eyebrow="CONVERSATIONS & NOTES"
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
                  <Plus size={16} /> Add
                </button>
              }
            />
            <RelationshipTimeline
              interactions={interactions}
              onEdit={setEditor}
            />
          </section>
          <section className="surface" id="next-steps">
            <SectionHeading
              title="Next steps"
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
                  Plan
                </button>
              }
            />
            {tasks.map((t) => (
              <TaskRow key={t.id} task={t} onEdit={setEditor} />
            ))}
            {!tasks.length && (
              <p className="muted">
                A thoughtful follow-up is a great place to start.
              </p>
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
              title={company ? "About the company" : "The little details"}
            />
            {company ? (
              <>
                <p className="body-copy">
                  {org?.description || "Add a description to tell their story."}
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
                  <span>Relationship</span>
                  <strong>{contact?.category}</strong>
                </div>
                <div className="detail-block">
                  <span>Last conversation</span>
                  <strong>
                    {last ? date(last) : "No conversations logged"}
                  </strong>
                </div>
                <div className="detail-block">
                  <span>Next follow-up</span>
                  <strong>
                    {next ? date(next!.dueAt) : "Room for a next step"}
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
                    Outreach is restricted according to this profile. No
                    messages are sent automatically.
                  </p>
                )}
              </>
            )}
          </section>
          {contact && <HealthSummary contactId={contact.id} />}
          {contact && <PermissionsPanel contact={contact} onEdit={setEditor} />}
          <section className="surface" id="opportunities">
            <SectionHeading
              title="Opportunities"
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
                  Create
                </button>
              }
            />
            {opportunities.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} onEdit={setEditor} />
            ))}
            {!opportunities.length && (
              <p className="muted">No opportunities linked yet.</p>
            )}
          </section>
        </aside>
      </div>
      {editor && (
        <EditorModal editor={editor} onClose={() => setEditor(null)} />
      )}
      {deleting && (
        <Confirm
          title={`Delete ${record.name}?`}
          body={
            company
              ? "The company will be deleted. People, interactions, tasks, opportunities, and activity are preserved and detached from this company."
              : "This deletes the contact and their interactions, tasks, restrictions, and activity. Linked opportunities are preserved without this person. This cannot be undone."
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
