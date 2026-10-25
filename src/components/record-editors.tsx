import { useState, type ReactNode, type FormEvent } from "react";
import { usePulse } from "../app/context";
import { Modal } from "./ui";
import {
  stages,
  availabilities,
  stamp,
  type Contact,
  type Opportunity,
  type Restriction,
  type Permission,
} from "../data/models";
import {
  saveOpportunity,
  deleteOpportunity,
  saveRestriction,
  endRestriction,
  savePermission,
} from "../data/repository";
export type RecordEditor =
  | {
      kind: "opportunity";
      record?: Opportunity;
      contact?: Contact;
      organizationId?: string;
    }
  | { kind: "restriction"; contact: Contact; record?: Restriction }
  | { kind: "permission"; contact: Contact; record?: Permission };
export function Field({
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
export const localDate = (value: string | Date) => {
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
export function RecordForm({
  title,
  children,
  onSave,
  onClose,
  onDelete,
  deleteLabel = "Delete opportunity",
}: {
  title: string;
  children: ReactNode;
  onSave: (data: FormData) => Promise<unknown>;
  onClose: () => void;
  onDelete?: () => Promise<unknown>;
  deleteLabel?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirm, setConfirm] = useState(false);
  const { notify } = usePulse();
  async function act(action: () => Promise<unknown>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await action();
      notify("Workspace updated");
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    void act(() => onSave(data));
  }
  return (
    <Modal
      title={title}
      onClose={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={submit}
        aria-describedby={error ? "record-error" : undefined}
      >
        {confirm ? (
          <p className="confirm-copy">
            Confirm this operation? Related people and companies are preserved.
            Deleted records cannot be recovered without a backup.
          </p>
        ) : (
          <div className="form-grid">{children}</div>
        )}
        {error && (
          <p id="record-error" role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={() => (confirm ? setConfirm(false) : onClose())}
          >
            {confirm ? "Go back" : "Cancel"}
          </button>
          {confirm ? (
            <button
              type="button"
              className="button danger"
              disabled={busy}
              onClick={() => void act(onDelete!)}
            >
              Confirm
            </button>
          ) : (
            <>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save changes"}
              </button>
              {onDelete && (
                <button
                  type="button"
                  className="button ghost destructive"
                  disabled={busy}
                  onClick={() => setConfirm(true)}
                >
                  {deleteLabel}
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </Modal>
  );
}
export function RecordEditorModal({
  editor,
  onClose,
}: {
  editor: RecordEditor;
  onClose: () => void;
}) {
  const p = usePulse();
  const [organizationId, setOrganizationId] = useState(
    editor.kind === "opportunity"
      ? editor.record?.organizationId ||
          editor.organizationId ||
          editor.contact?.organizationId ||
          ""
      : "",
  );
  const [restrictionType, setRestrictionType] = useState(
    editor.kind === "restriction"
      ? editor.record?.type ||
          (editor.contact.availability === "Available"
            ? "Temporarily unavailable"
            : editor.contact.availability)
      : "Available",
  );
  const str = (d: FormData, k: string) => String(d.get(k) || "").trim();
  const iso = (d: FormData, k: string) =>
    str(d, k) ? new Date(str(d, k)).toISOString() : null;
  const r = editor.record;
  if (editor.kind === "opportunity") {
    const o = editor.record;
    return (
      <RecordForm
        title={o ? "Opportunity details" : "New opportunity"}
        onClose={onClose}
        onDelete={o ? () => deleteOpportunity(p.db, o.id) : undefined}
        onSave={async (d) =>
          saveOpportunity(p.db, {
            ...stamp(),
            ...o,
            title: str(d, "title"),
            organizationId: organizationId || null,
            contactIds: d.getAll("contactIds").map(String),
            pipelineId: p.settings.pipeline.id,
            stageId: str(d, "stageId") as Opportunity["stageId"],
            status: "open",
            value: str(d, "value") === "" ? null : Number(str(d, "value")),
            currency: str(d, "currency").toUpperCase(),
            probability:
              str(d, "probability") === ""
                ? null
                : Number(str(d, "probability")),
            expectedCloseAt: iso(d, "expectedCloseAt"),
            notes: str(d, "notes"),
          })
        }
      >
        <Field label="Opportunity title" wide>
          <input
            name="title"
            required
            maxLength={300}
            defaultValue={o?.title}
            autoFocus
          />
        </Field>
        <Field label="Company" wide>
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            <option value="">Independent opportunity</option>
            {p.organizations.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
        <fieldset className="wide people-picker" key={organizationId}>
          <legend>Associated people</legend>
          {p.contacts
            .filter(
              (c) =>
                !organizationId ||
                c.organizationId === organizationId ||
                (o?.organizationId === organizationId &&
                  o.contactIds.includes(c.id)),
            )
            .map((c) => (
              <label key={c.id}>
                <input
                  type="checkbox"
                  name="contactIds"
                  value={c.id}
                  defaultChecked={
                    o?.contactIds.includes(c.id) || editor.contact?.id === c.id
                  }
                />
                <span>
                  {c.name}
                  {c.organizationId !== organizationId && organizationId
                    ? " · previous representative"
                    : ""}
                </span>
              </label>
            ))}
          <small>
            Select the representatives involved in this opportunity.
          </small>
        </fieldset>
        <Field label="Pipeline">
          <input readOnly value={p.settings.pipeline.name} />
        </Field>
        <Field label="Stage / outcome">
          <select name="stageId" defaultValue={o?.stageId || "New"}>
            {stages.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <small>
            Won and Lost close the deal. Select an active stage to reopen it.
          </small>
        </Field>
        <Field label="Value (optional)">
          <input
            name="value"
            type="number"
            min="0"
            step="0.01"
            defaultValue={o?.value ?? ""}
          />
        </Field>
        <Field label="Currency">
          <input
            name="currency"
            required
            pattern="[A-Za-z]{3}"
            maxLength={3}
            defaultValue={o?.currency || p.settings.pipeline.currency}
          />
        </Field>
        <Field label="Expected close (device time)">
          <input
            type="datetime-local"
            name="expectedCloseAt"
            defaultValue={
              o?.expectedCloseAt ? localDate(o.expectedCloseAt) : ""
            }
          />
        </Field>
        <Field label="Probability · user entered (%)">
          <input
            name="probability"
            type="number"
            min="0"
            max="100"
            defaultValue={o?.probability ?? ""}
          />
        </Field>
        <Field label="Notes" wide>
          <textarea
            name="notes"
            rows={4}
            maxLength={20000}
            defaultValue={o?.notes}
          />
        </Field>
      </RecordForm>
    );
  }
  if (editor.kind === "restriction") {
    const v = editor.record;
    return (
      <RecordForm
        title="Availability & timeout"
        onClose={onClose}
        onDelete={v ? () => endRestriction(p.db, v.id) : undefined}
        deleteLabel="End restriction"
        onSave={(d) =>
          saveRestriction(p.db, {
            ...stamp(),
            ...v,
            id: v?.id || `profile-${editor.contact.id}`,
            contactId: editor.contact.id,
            type: restrictionType as Restriction["type"],
            startAt: iso(d, "startAt"),
            endAt:
              restrictionType === "Temporarily unavailable"
                ? iso(d, "endAt")
                : null,
            reason: str(d, "reason"),
            source: str(d, "source"),
          })
        }
      >
        <p className="field-help wide">
          Temporary pauses expire for review. On hold and Do not contact remain
          indefinite until explicitly ended. No messages are sent.
        </p>
        <Field label="Availability" wide>
          <select
            value={restrictionType}
            onChange={(e) =>
              setRestrictionType(e.target.value as Restriction["type"])
            }
          >
            {availabilities.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Starts (device time)">
          <input
            name="startAt"
            type="datetime-local"
            defaultValue={
              v?.startAt ? localDate(v.startAt) : localDate(new Date())
            }
          />
        </Field>
        {restrictionType === "Temporarily unavailable" && (
          <Field label="Until (optional, device time)">
            <input
              name="endAt"
              type="datetime-local"
              defaultValue={
                v?.endAt
                  ? localDate(v.endAt)
                  : localDate(
                      new Date(Date.now() + p.settings.timeoutDays * 86400000),
                    )
              }
            />
          </Field>
        )}
        <Field label="Reason" wide>
          <input
            name="reason"
            maxLength={1000}
            defaultValue={v?.reason}
            placeholder="e.g. Budget review period"
          />
        </Field>
        <Field label="Source / explanation" wide>
          <textarea
            name="source"
            maxLength={5000}
            rows={3}
            defaultValue={v?.source}
            placeholder="Client request during a call"
          />
        </Field>
      </RecordForm>
    );
  }
  const v = editor.record;
  return (
    <RecordForm
      title="Communication permission"
      onClose={onClose}
      onSave={(d) =>
        savePermission(p.db, {
          ...stamp(),
          ...v,
          contactId: editor.contact.id,
          channel: str(d, "channel") as Permission["channel"],
          purpose: str(d, "purpose") as Permission["purpose"],
          status: str(d, "status") as Permission["status"],
          evidence: str(d, "evidence"),
          withdrawnAt: iso(d, "withdrawnAt"),
        })
      }
    >
      <p className="field-help wide">
        Unknown means no permission recorded. Marketing and relationship
        communication are distinct. A timeout ending never grants consent.
      </p>
      <Field label="Channel">
        <select name="channel" defaultValue={v?.channel || "Email"}>
          {["Email", "Phone", "Message", "All"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Purpose">
        <select name="purpose" defaultValue={v?.purpose || "Relationship"}>
          {["Relationship", "Marketing"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Permission status">
        <select name="status" defaultValue={v?.status || "Unknown"}>
          {["Unknown", "Granted", "Denied", "Withdrawn"].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Withdrawal date (if withdrawn)">
        <input
          name="withdrawnAt"
          type="datetime-local"
          defaultValue={v?.withdrawnAt ? localDate(v.withdrawnAt) : ""}
        />
      </Field>
      <Field label="Evidence / source" wide>
        <textarea
          name="evidence"
          rows={4}
          defaultValue={r && "evidence" in r ? r.evidence : ""}
          maxLength={5000}
        />
      </Field>
    </RecordForm>
  );
}
