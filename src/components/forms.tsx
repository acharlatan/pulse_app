import { useInterfaceText } from "../i18n/useInterfaceText";
import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import { useTranslation } from "../i18n/useTranslation";
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
  type Interaction,
  type Task,
} from "../data/models";
import {
  saveContact,
  saveOrganization,
  addInteraction,
  saveTask,
  updateInteraction,
  deleteInteraction,
  deleteTask,
} from "../data/repository";
import { RecordEditorModal, type RecordEditor } from "./record-editors";
export type Editor = BasicEditor | RecordEditor;
type BasicEditor =
  | { kind: "contact"; record?: Contact; organizationId?: string }
  | { kind: "company"; record?: Organization }
  | {
      kind: "interaction";
      contact?: Contact;
      organizationId?: string;
      note?: boolean;
      record?: Interaction;
    }
  | { kind: "task"; contact?: Contact; organizationId?: string; record?: Task };
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
  const __pulseText = useInterfaceText();
  const { db } = usePulse();
  const [continuation, setContinuation] = useState<BasicEditor | null>(null);
  const currentEditor = continuation || editor;
  const [snapshot, setSnapshot] = useState<Editor | null>(null);
  const [loadError, setLoadError] = useState("");
  useEffect(() => {
    let active = true;
    setSnapshot(null);
    const tables = {
      contact: db.contacts,
      company: db.organizations,
      interaction: db.interactions,
      task: db.tasks,
      opportunity: db.opportunities,
      restriction: db.restrictions,
      permission: db.permissions,
    };
    const record = currentEditor.record;
    if (!record) {
      setSnapshot(currentEditor);
      return;
    }
    void tables[currentEditor.kind]
      .get(record.id)
      .then((latest) => {
        if (!active) return;
        if (!latest)
          setLoadError(
            "This record no longer exists. Close this editor and review the latest workspace.",
          );
        else setSnapshot({ ...currentEditor, record: latest } as Editor);
      })
      .catch(() => {
        if (active)
          setLoadError(
            "Could not read this record. Check browser storage and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [db, currentEditor]);
  if (loadError)
    return (
      <Modal title={__pulseText("Record unavailable")} onClose={onClose}>
        <p role="alert">{__pulseText(loadError)}</p>
      </Modal>
    );
  if (!snapshot)
    return (
      <Modal title={__pulseText("Opening record")} onClose={onClose}>
        <p role="status">{__pulseText("Reading the latest saved record…")}</p>
      </Modal>
    );
  if (
    snapshot.kind === "opportunity" ||
    snapshot.kind === "restriction" ||
    snapshot.kind === "permission"
  )
    return <RecordEditorModal editor={snapshot} onClose={onClose} />;
  return <BasicEditorModal key={continuation ? "follow-up" : "initial"} editor={snapshot} onClose={onClose} onContinue={setContinuation} continued={!!continuation} />;
}

function BasicEditorModal({
  editor,
  onClose,
  onContinue,
  continued,
}: {
  editor: BasicEditor;
  onClose: () => void;
  onContinue: (editor: BasicEditor) => void;
  continued: boolean;
}) {
  const __pulseText = useInterfaceText();
  const t = useTranslation();
  const { db, organizations, contacts, opportunities, tasks, settings, run } =
    usePulse();
  const [deleting, setDeleting] = useState(false);
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
          ? editor.record
            ? "Edit follow-up"
            : "Plan a follow-up"
          : editor.record
            ? "Edit interaction"
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
          saveOrganization(
            db,
            {
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
            },
            current?.updatedAt,
          );
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
          saveContact(
            db,
            {
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
            },
            current?.updatedAt,
          );
      } else if (editor.kind === "interaction") {
        action = () =>
          (editor.record ? updateInteraction : addInteraction)(
            db,
            {
              ...stamp(),
              ...editor.record,
              contactId: str("contactId") || null,
              organizationId: str("organizationId") || null,
              type: str("type") as "Note",
              occurredAt: new Date(str("occurredAt")).toISOString(),
              summary: str("summary"),
              outcome: str("outcome"),
              opportunityId: str("opportunityId") || null,
              followUpId: str("followUpId") || null,
            },
            editor.record?.updatedAt,
          );
      } else {
        action = () =>
          saveTask(
            db,
            {
              ...stamp(),
              ...editor.record,
              title: str("title"),
              description: str("description"),
              contactId: str("contactId") || null,
              organizationId: str("organizationId") || null,
              dueAt: new Date(str("dueAt")).toISOString(),
              completedAt: editor.record?.completedAt || null,
              priority: str("priority") as Contact["priority"],
              reminderMinutes: 60,
            },
            editor.record?.updatedAt,
          );
      }
      const result = await action();
      await run(async () => result, "Saved to your workspace");
      if (editor.kind === "interaction" && !editor.record && form.get("planFollowUp")) {
        const contact = contacts.find((c) => c.id === str("contactId"));
        onContinue({ kind: "task", contact, organizationId: str("organizationId") || undefined });
      } else onClose();
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
      {continued && <p className="continuation-notice" role="status">{__pulseText("Interaction saved. You can plan a separate follow-up below; closing this form keeps the interaction saved.")}</p>}
      {deleting ? (
        <>
          <p>
            {__pulseText("Delete this record? Related tasks, people and companies are preserved.")}</p>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(false)}
            >
              {t("cancel")}
            </button>
            <button
              className="button danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                if (
                  await run(
                    () =>
                      editor.kind === "interaction"
                        ? deleteInteraction(db, editor.record!.id)
                        : deleteTask(db, editor.record!.id),
                    "Record deleted",
                  )
                )
                  onClose();
                setBusy(false);
              }}
            >
              {__pulseText("Confirm delete")}</button>
          </div>
        </>
      ) : (
        <form
          onSubmit={submit}
          aria-describedby={error ? "form-error" : undefined}
        >
          <div className="form-grid">
            {editor.kind === "company" && (
              <>
                <Field label={t("companyName")} wide>
                  <input
                    name="name"
                    required
                    maxLength={200}
                    autoFocus
                    defaultValue={rec?.name}
                    placeholder={__pulseText("e.g. Forma Studio")}
                  />
                </Field>
                <Field label={__pulseText("Industry")}>
                  <input
                    name="industry"
                    defaultValue={editor.record?.industry}
                    placeholder={__pulseText("Design & creative")}
                  />
                </Field>
                <Field label={__pulseText("Location")}>
                  <input
                    name="location"
                    defaultValue={editor.record?.location}
                    placeholder={__pulseText("City, country")}
                  />
                </Field>
                <Field label={__pulseText("Website")} wide>
                  <input
                    name="website"
                    type="url"
                    defaultValue={editor.record?.website}
                    placeholder="https://example.com"
                  />
                </Field>
                <Field label={__pulseText("About the company")} wide>
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
                <Field label={t("fullName")} wide>
                  <input
                    name="name"
                    required
                    maxLength={200}
                    autoFocus
                    defaultValue={editor.record?.name}
                    placeholder={__pulseText("A new connection")}
                  />
                </Field>
                <Field label={t("preferredName")}>
                  <input
                    name="preferredName"
                    defaultValue={editor.record?.preferredName}
                  />
                </Field>
                <Field label={t("roleTitle")}>
                  <input name="role" defaultValue={editor.record?.role} />
                </Field>
                <Field label={t("company")} wide>
                  <select
                    name="organizationId"
                    defaultValue={
                      editor.record?.organizationId ||
                      editor.organizationId ||
                      ""
                    }
                  >
                    <option value="">{__pulseText("Independent / no company")}</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={t("email")}>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editor.record?.emails[0]}
                  />
                </Field>
                <Field label={t("phone")}>
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={editor.record?.phones[0]}
                  />
                </Field>
                <Field label={t("relationship")}>
                  <select
                    name="category"
                    defaultValue={editor.record?.category || "Prospect"}
                  >
                    {categories.map((s) => (
                      <option key={s} value={s}>{__pulseText(s)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("stage")}>
                  <select
                    name="stage"
                    defaultValue={editor.record?.stage || "New"}
                  >
                    {stages.map((s) => (
                      <option key={s} value={s}>{__pulseText(s)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("priority")}>
                  <select
                    name="priority"
                    defaultValue={editor.record?.priority || "Normal"}
                  >
                    {priorities.map((s) => (
                      <option key={s} value={s}>{__pulseText(s)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("availability")}>
                  <select
                    name="availability"
                    value={availability}
                    onChange={(e) =>
                      setAvailability(e.target.value as Contact["availability"])
                    }
                  >
                    {availabilities.map((s) => (
                      <option key={s} value={s}>{__pulseText(s)}</option>
                    ))}
                  </select>
                </Field>
                {availability === "Temporarily unavailable" && (
                  <Field label={__pulseText("Pause until (optional)")} wide>
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
                      {__pulseText("Without a date, outreach stays paused until you change it.")}</small>
                  </Field>
                )}
              </>
            )}
            {(editor.kind === "contact" || editor.kind === "company") && (
              <Field label={__pulseText("Tags · separated by commas")} wide>
                <input
                  name="tags"
                  defaultValue={rec?.tags.join(", ")}
                  placeholder={__pulseText("Partnership, Creative")}
                />
              </Field>
            )}
            {(editor.kind === "interaction" || editor.kind === "task") && (
              <>
                <Field label={__pulseText("Related person")} wide>
                  <select
                    name="contactId"
                    defaultValue={
                      editor.record?.contactId || editor.contact?.id || ""
                    }
                  >
                    <option value="">{__pulseText("No person / company only")}</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                {
                  <Field
                    label={
                      editor.kind === "interaction" && editor.record
                        ? __pulseText("Historical company")
                        : __pulseText("Related company (used when no person)")
                    }
                  >
                    <select
                      name="organizationId"
                      defaultValue={
                        editor.record?.organizationId ||
                        editor.organizationId ||
                        editor.contact?.organizationId ||
                        ""
                      }
                    >
                      <option value="">{__pulseText("No company")}</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                }
                {editor.kind === "interaction" && (
                  <>
                    <Field label={__pulseText("Related opportunity")}>
                      <select
                        name="opportunityId"
                        defaultValue={editor.record?.opportunityId || ""}
                      >
                        <option value="">{__pulseText("None")}</option>
                        {opportunities.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={__pulseText("Linked follow-up")}>
                      <select
                        name="followUpId"
                        defaultValue={editor.record?.followUpId || ""}
                      >
                        <option value="">{__pulseText("None")}</option>
                        {tasks.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </>
            )}
            {editor.kind === "interaction" && (
              <>
                <Field label={__pulseText("Interaction type")}>
                  <select
                    name="type"
                    defaultValue={
                      editor.record?.type || (editor.note ? "Note" : "Call")
                    }
                  >
                    {["Call", "Email", "Meeting", "Message", "Note"].map(
                      (s) => (
                        <option key={s} value={s}>{__pulseText(s)}</option>
                      ),
                    )}
                  </select>
                </Field>
                <Field label={__pulseText("When")}>
                  <input
                    name="occurredAt"
                    type="datetime-local"
                    required
                    defaultValue={localDate(
                      new Date(editor.record?.occurredAt || Date.now()),
                    )}
                  />
                </Field>
                <Field label={__pulseText("What would you like to remember?")} wide>
                  <textarea
                    autoFocus
                    name="summary"
                    required
                    maxLength={20000}
                    rows={5}
                    defaultValue={editor.record?.summary}
                    placeholder={__pulseText("The details that make this relationship personal…")}
                  />
                </Field>
                <Field label={__pulseText("Outcome / next step")} wide>
                  <input
                    name="outcome"
                    defaultValue={editor.record?.outcome}
                    placeholder={__pulseText("e.g. Share a proposal next week")}
                  />
                </Field>
                {!editor.record && <label className="interaction-followup-choice wide"><input type="checkbox" name="planFollowUp" /><span><strong>{__pulseText("Plan a follow-up after saving")}</strong><small>{__pulseText("Continue with the same person or company. The follow-up is saved separately.")}</small></span></label>}
              </>
            )}
            {editor.kind === "task" && (
              <>
                <Field label={t("followupTitle")} wide>
                  <input
                    name="title"
                    defaultValue={editor.record?.title}
                    required
                    maxLength={300}
                    autoFocus
                    placeholder={
                      editor.contact
                        ? `Check in with ${editor.contact.preferredName || editor.contact.name}`
                        : __pulseText("Your next meaningful action")
                    }
                  />
                </Field>
                <Field label={t("dueDate")}>
                  <input
                    name="dueAt"
                    type="datetime-local"
                    required
                    defaultValue={localDate(
                      new Date(
                        editor.record?.dueAt ||
                          Date.now() + settings.followUpDays * 86400000,
                      ),
                    )}
                  />
                </Field>
                <Field label={t("priority")}>
                  <select
                    name="priority"
                    defaultValue={editor.record?.priority || "Normal"}
                  >
                    {priorities.map((s) => (
                      <option key={s} value={s}>{__pulseText(s)}</option>
                    ))}
                  </select>
                </Field>
                <Field label={t("details")} wide>
                  <textarea
                    name="description"
                    rows={3}
                    maxLength={10000}
                    defaultValue={editor.record?.description}
                  />
                </Field>
                <p className="field-help wide">
                  {__pulseText("This reminder appears in PULSE while the app is open. Nothing is sent automatically.")}</p>
              </>
            )}
          </div>
          {error && (
            <p id="form-error" className="form-error" role="alert">
              {__pulseText(error)}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              {t("cancel")}
            </button>
            {(editor.kind === "interaction" || editor.kind === "task") &&
              editor.record && (
                <button
                  type="button"
                  className="button ghost destructive"
                  onClick={() => setDeleting(true)}
                >
                  {__pulseText("Delete record")}</button>
              )}
            <button className="button primary" disabled={busy}>
              {busy ? t("saving") : editor.kind === "company" ? t("saveCompany") : editor.kind === "contact" ? t("savePerson") : editor.kind === "task" ? t("saveFollowup") : t("saveInteraction")}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
