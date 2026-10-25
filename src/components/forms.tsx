import { useState, type FormEvent, type ReactNode } from "react";
import { usePulse } from "../app/context";
import { Modal } from "./ui";
import {
  categories,
  stages,
  priorities,
  availabilities,
  stamp,
  type Contact,
  type Organization,
} from "../data/models";
import {
  saveContact,
  saveOrganization,
  addInteraction,
  saveTask,
} from "../data/repository";
export type Editor =
  | { kind: "contact"; record?: Contact; organizationId?: string }
  | { kind: "company"; record?: Organization }
  | { kind: "interaction"; contact: Contact; note?: boolean }
  | { kind: "task"; contact?: Contact; organizationId?: string };
function Field({
  label,
  children,
  wide = false,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`field ${wide ? "wide" : ""}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function EditorModal({
  editor,
  onClose,
}: {
  editor: Editor;
  onClose: () => void;
}) {
  const { db, organizations, settings, run } = usePulse();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [availability, setAvailability] = useState(
    editor.kind === "contact"
      ? editor.record?.availability || "Available"
      : "Available",
  );
  const title =
    editor.kind === "company"
      ? `${editor.record ? "Edit" : "New"} company`
      : editor.kind === "contact"
        ? `${editor.record ? "Edit" : "New"} person`
        : editor.kind === "task"
          ? "Plan a follow-up"
          : editor.note
            ? "Add a note"
            : "Log an interaction";
  const rec =
    editor.kind === "contact" || editor.kind === "company"
      ? editor.record
      : undefined;
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const form = new FormData(e.currentTarget);
    const str = (key: string) => String(form.get(key) || "").trim();
    setError("");
    setBusy(true);
    try {
      let action: () => Promise<unknown>;
      if (editor.kind === "company") {
        const current = editor.record;
        const website = str("website");
        if (website && !/^https?:\/\//i.test(website))
          throw new Error("Website must start with https:// or http://.");
        action = () =>
          saveOrganization(db, {
            ...stamp(),
            ...current,
            name: str("name"),
            industry: str("industry"),
            website,
            location: str("location"),
            description: str("description"),
            avatar: current?.avatar || "",
            tags: str("tags")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            customFields: current?.customFields || {},
          });
      } else if (editor.kind === "contact") {
        const current = editor.record;
        const timeout = str("timeout");
        if (
          availability === "Temporarily unavailable" &&
          timeout &&
          Date.parse(timeout) <= Date.now()
        )
          throw new Error("Choose a future date for the timeout.");
        const email = str("email");
        if (
          !current &&
          email &&
          (await db.contacts.toArray()).some((c) => c.emails.includes(email))
        )
          throw new Error("A contact with this email already exists.");
        action = () =>
          saveContact(db, {
            ...stamp(),
            ...current,
            name: str("name"),
            preferredName: str("preferredName"),
            role: str("role"),
            organizationId: str("organizationId") || null,
            emails: [
              ...(email ? [email] : []),
              ...(current?.emails.slice(1) || []),
            ],
            phones: [
              ...(str("phone") ? [str("phone")] : []),
              ...(current?.phones.slice(1) || []),
            ],
            links: current?.links || [],
            avatar: current?.avatar || "",
            category: str("category") as Contact["category"],
            stage: str("stage") as Contact["stage"],
            priority: str("priority") as Contact["priority"],
            availability: availability as Contact["availability"],
            timeoutUntil:
              availability === "Temporarily unavailable" && timeout
                ? new Date(timeout + "T23:59:59").toISOString()
                : null,
            tags: str("tags")
              .split(",")
              .map((v) => v.trim())
              .filter(Boolean),
            nextFollowUp: current?.nextFollowUp || null,
          });
      } else if (editor.kind === "interaction") {
        action = () =>
          addInteraction(db, {
            ...stamp(),
            contactId: editor.contact.id,
            organizationId: editor.contact.organizationId,
            type: str("type") as "Note",
            occurredAt: new Date(str("occurredAt")).toISOString(),
            summary: str("summary"),
            outcome: str("outcome"),
            opportunityId: null,
            followUpId: null,
          });
      } else {
        action = () =>
          saveTask(db, {
            ...stamp(),
            title: str("title"),
            description: str("description"),
            contactId: editor.contact?.id || null,
            organizationId:
              editor.contact?.organizationId || editor.organizationId || null,
            dueAt: new Date(str("dueAt")).toISOString(),
            completedAt: null,
            priority: str("priority") as Contact["priority"],
            reminderMinutes: 60,
          });
      }
      if (await run(action, "Saved to your workspace")) onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Check your information and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const localDate = (date: Date) =>
    new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={submit}
        aria-describedby={error ? "form-error" : undefined}
      >
        <div className="form-grid">
          {editor.kind === "company" && (
            <>
              <Field label="Company name" wide>
                <input
                  name="name"
                  required
                  maxLength={200}
                  autoFocus
                  defaultValue={rec?.name}
                  placeholder="e.g. Forma Studio"
                />
              </Field>
              <Field label="Industry">
                <input
                  name="industry"
                  defaultValue={editor.record?.industry}
                  placeholder="Design & creative"
                />
              </Field>
              <Field label="Location">
                <input
                  name="location"
                  defaultValue={editor.record?.location}
                  placeholder="City, country"
                />
              </Field>
              <Field label="Website" wide>
                <input
                  name="website"
                  type="url"
                  defaultValue={editor.record?.website}
                  placeholder="https://example.com"
                />
              </Field>
              <Field label="About the company" wide>
                <textarea
                  name="description"
                  rows={4}
                  maxLength={10000}
                  defaultValue={editor.record?.description}
                />
              </Field>
            </>
          )}
          {editor.kind === "contact" && (
            <>
              <Field label="Full name" wide>
                <input
                  name="name"
                  required
                  maxLength={200}
                  autoFocus
                  defaultValue={editor.record?.name}
                  placeholder="A new connection"
                />
              </Field>
              <Field label="Preferred name">
                <input
                  name="preferredName"
                  defaultValue={editor.record?.preferredName}
                />
              </Field>
              <Field label="Role or title">
                <input name="role" defaultValue={editor.record?.role} />
              </Field>
              <Field label="Company" wide>
                <select
                  name="organizationId"
                  defaultValue={
                    editor.record?.organizationId || editor.organizationId || ""
                  }
                >
                  <option value="">Independent / no company</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Email">
                <input
                  name="email"
                  type="email"
                  defaultValue={editor.record?.emails[0]}
                />
              </Field>
              <Field label="Phone">
                <input
                  name="phone"
                  type="tel"
                  defaultValue={editor.record?.phones[0]}
                />
              </Field>
              <Field label="Relationship">
                <select
                  name="category"
                  defaultValue={editor.record?.category || "Prospect"}
                >
                  {categories.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Stage">
                <select
                  name="stage"
                  defaultValue={editor.record?.stage || "New"}
                >
                  {stages.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Priority">
                <select
                  name="priority"
                  defaultValue={editor.record?.priority || "Normal"}
                >
                  {priorities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Availability">
                <select
                  name="availability"
                  value={availability}
                  onChange={(e) =>
                    setAvailability(e.target.value as Contact["availability"])
                  }
                >
                  {availabilities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              {availability === "Temporarily unavailable" && (
                <Field label="Pause until (optional)" wide>
                  <input
                    name="timeout"
                    type="date"
                    defaultValue={
                      editor.record?.timeoutUntil?.slice(0, 10) ||
                      new Date(Date.now() + settings.timeoutDays * 86400000)
                        .toISOString()
                        .slice(0, 10)
                    }
                  />
                  <small>
                    Without a date, outreach stays paused until you change it.
                  </small>
                </Field>
              )}
            </>
          )}
          {(editor.kind === "contact" || editor.kind === "company") && (
            <Field label="Tags · separated by commas" wide>
              <input
                name="tags"
                defaultValue={rec?.tags.join(", ")}
                placeholder="Partnership, Creative"
              />
            </Field>
          )}
          {editor.kind === "interaction" && (
            <>
              <Field label="Interaction type">
                <select
                  name="type"
                  defaultValue={editor.note ? "Note" : "Call"}
                >
                  {["Call", "Email", "Meeting", "Message", "Note"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="When">
                <input
                  name="occurredAt"
                  type="datetime-local"
                  required
                  defaultValue={localDate(new Date())}
                />
              </Field>
              <Field label="What would you like to remember?" wide>
                <textarea
                  autoFocus
                  name="summary"
                  required
                  maxLength={20000}
                  rows={5}
                  placeholder="The details that make this relationship personal…"
                />
              </Field>
              <Field label="Outcome / next step" wide>
                <input
                  name="outcome"
                  placeholder="e.g. Share a proposal next week"
                />
              </Field>
            </>
          )}
          {editor.kind === "task" && (
            <>
              <Field label="Follow-up title" wide>
                <input
                  name="title"
                  required
                  maxLength={300}
                  autoFocus
                  placeholder={
                    editor.contact
                      ? `Check in with ${editor.contact.preferredName || editor.contact.name}`
                      : "Your next meaningful action"
                  }
                />
              </Field>
              <Field label="Due date and time">
                <input
                  name="dueAt"
                  type="datetime-local"
                  required
                  defaultValue={localDate(
                    new Date(Date.now() + settings.followUpDays * 86400000),
                  )}
                />
              </Field>
              <Field label="Priority">
                <select name="priority" defaultValue="Normal">
                  {priorities.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Details" wide>
                <textarea name="description" rows={3} maxLength={10000} />
              </Field>
              <p className="field-help wide">
                This reminder appears in PULSE while the app is open. Nothing is
                sent automatically.
              </p>
            </>
          )}
        </div>
        {error && (
          <p id="form-error" className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={busy}>
            {busy
              ? "Saving…"
              : "Save " +
                (editor.kind === "company"
                  ? "company"
                  : editor.kind === "contact"
                    ? "person"
                    : editor.kind === "task"
                      ? "follow-up"
                      : "interaction")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
