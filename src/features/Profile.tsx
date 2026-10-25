import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  CalendarPlus,
  Clock3,
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
import { EditorModal, type Editor } from "../components/forms";
import {
  deleteContact,
  deleteOrganization,
  completeTask,
} from "../data/repository";
import {
  eligible,
  lastInteraction,
  overdue,
} from "../services/recommendations";
export function Profile({ company = false }: { company?: boolean }) {
  const { id } = useParams();
  const p = usePulse();
  const navigate = useNavigate();
  const { date, money } = useFormat();
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
  const last = contact
    ? lastInteraction(contact.id, p.interactions)
    : undefined;
  return (
    <div className="page profile-page">
      <Link to="/network" className="text-link back-link">
        <ArrowLeft size={16} />
        Back to your network
      </Link>
      <section className="surface profile-header">
        <div className="profile-cover">
          <div />
          <span>EVERY RELATIONSHIP HAS A STORY.</span>
        </div>
        <div className="profile-identity">
          <Avatar name={record.name} size="xl" company={company} />
          <div className="profile-heading-actions">
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
                  <Badge tone="purple">{contact.stage}</Badge>
                  <Badge tone="amber">{contact.priority} priority</Badge>
                  <Badge
                    tone={
                      eligible(contact, p.permissions, p.restrictions)
                        ? "green"
                        : "red"
                    }
                  >
                    {contact.availability}
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
              <button
                className="button primary"
                onClick={() =>
                  setEditor({ kind: "contact", organizationId: id })
                }
              >
                <Plus size={17} />
                Add representative
              </button>
            )}
          </div>
        </div>
      </section>
      <div className="profile-columns">
        <aside>
          <section className="surface">
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
                    {tasks.find((t) => !t.completedAt)
                      ? date(tasks.find((t) => !t.completedAt)!.dueAt)
                      : "Room for a next step"}
                  </strong>
                </div>
                {contact?.emails.map((email) => (
                  <a
                    className="detail-line"
                    key={email}
                    href={`mailto:${email}`}
                  >
                    <Mail size={16} />
                    {email}
                  </a>
                ))}
                {contact?.phones.map((phone) => (
                  <a className="detail-line" key={phone} href={`tel:${phone}`}>
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
          <section className="surface">
            <SectionHeading title="Opportunities" />
            {opportunities.map((o) => (
              <Link to="/pipeline" className="opportunity-preview" key={o.id}>
                <strong>{o.title}</strong>
                <span>
                  {o.value === null
                    ? "No value set"
                    : money(o.value, o.currency)}
                  <Badge tone="purple">{o.stageId}</Badge>
                </span>
              </Link>
            ))}
            {!opportunities.length && (
              <p className="muted">No opportunities linked yet.</p>
            )}
          </section>
        </aside>
        <div className="profile-story">
          {company && (
            <section className="surface">
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
                    <Avatar name={c.name} />
                    <div>
                      <strong>{c.name}</strong>
                      <span>{c.role}</span>
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
          <section className="surface">
            <SectionHeading
              title="Relationship story"
              eyebrow="CONVERSATIONS & NOTES"
              action={
                contact && (
                  <button
                    className="button ghost"
                    onClick={() => setEditor({ kind: "interaction", contact })}
                  >
                    <Plus size={16} />
                    Add
                  </button>
                )
              }
            />
            {interactions.map((i) => (
              <article className="story-entry" key={i.id}>
                <div className="story-meta">
                  <span className="soft-icon">
                    <MessageCircle size={16} />
                  </span>
                  <strong>{i.type}</strong>
                  <time>
                    {date(i.occurredAt, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </div>
                <p>{i.summary}</p>
                {i.outcome && (
                  <div className="story-outcome">
                    Next step <span>{i.outcome}</span>
                  </div>
                )}
              </article>
            ))}
            {!interactions.length && (
              <Empty
                title="A story waiting to be told"
                body="Log a conversation or a note to remember what matters."
              />
            )}
          </section>
          <section className="surface">
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
              <div className="profile-task" key={t.id}>
                <div>
                  <strong className={t.completedAt ? "completed-text" : ""}>
                    {t.title}
                  </strong>
                  <small
                    className={!t.completedAt && overdue(t) ? "overdue" : ""}
                  >
                    {t.completedAt
                      ? "Completed"
                      : overdue(t)
                        ? "Overdue"
                        : "Due"}{" "}
                    · {date(t.completedAt || t.dueAt)}
                  </small>
                </div>
                {!t.completedAt && (
                  <button
                    className="button secondary small-button"
                    onClick={() =>
                      p.run(
                        () => completeTask(p.db, t.id),
                        "Follow-up completed",
                      )
                    }
                  >
                    Complete
                  </button>
                )}
              </div>
            ))}
            {!tasks.length && (
              <p className="muted">
                A thoughtful follow-up is a great place to start.
              </p>
            )}
          </section>
        </div>
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
