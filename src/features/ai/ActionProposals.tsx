import { useInterfaceText } from "../../i18n/useInterfaceText";
import { useState } from "react";
import { usePulse } from "../../app/context";
import { acceptAITask } from "../../data/ai-repository";
import type { AIResult, AIContext } from "../../ai/contracts";
export function ActionProposals({
  actions,
  scope,
  id,
  context,
  inputNote,
}: {
  actions: AIResult["actions"];
  scope: AIContext["scope"];
  id: string;
  context: AIContext;
  inputNote: string;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    [saving, setSaving] = useState(false),
    [saved, setSaved] = useState<number[]>([]);
  return (
    <>
      {actions.map((a, i) => (
        <form
          className="ai-proposal"
          key={i}
          onSubmit={async (e) => {
            e.preventDefault();
            if (saving) return;
            const f = new FormData(e.currentTarget);
            setSaving(true);
            const contactId = String(f.get("contactId")) || null;
            const ok = await p.run(
              () =>
                acceptAITask(p.db, {
                  title: String(f.get("title")),
                  description: String(f.get("description")),
                  dueAt: new Date(String(f.get("due"))).toISOString(),
                  contactId,
                  organizationId: contactId
                    ? p.contacts.find((c) => c.id === contactId)
                        ?.organizationId || null
                    : scope === "organization"
                      ? id
                      : null,
                }),
              "Reviewed task saved. No XP awarded.",
            );
            if (ok) setSaved((v) => [...v, i]);
            setSaving(false);
          }}
        >
          <h3>{__pulseText("Proposed next step") + " "}{i + 1}</h3>
          <p>{a.reason}</p>
          <details>
            <summary>{__pulseText("Review proposed task sources")}</summary>
            {a.refs.length ? (
              a.refs.map((ref) => (
                <p key={ref}>
                  {ref}:{" "}
                  {ref === "input-note"
                    ? inputNote
                    : context.records.find((r) => r.id === ref)?.text ||
                      __pulseText("Source unavailable")}
                </p>
              ))
            ) : (
              <p>{__pulseText("No source was cited. Verify this suggestion independently.")}</p>
            )}
          </details>
          {saved.includes(i) ? (
            <p>{__pulseText("Saved or rejected; no repeated submission.")}</p>
          ) : (
            <>
              <label className="field">
                <span>{__pulseText("Proposed task title") + " "}{i + 1}</span>
                <input
                  name="title"
                  required
                  maxLength={300}
                  defaultValue={a.title}
                />
              </label>
              <label className="field">
                <span>{__pulseText("Proposed task details") + " "}{i + 1}</span>
                <textarea name="description" defaultValue={a.description} />
              </label>
              <label className="field">
                <span>{__pulseText("Task contact") + " "}{i + 1}</span>
                <select
                  name="contactId"
                  defaultValue={scope === "contact" ? id : ""}
                >
                  <option value="">{__pulseText("Company-level administration")}</option>
                  {p.contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <p className="muted">
                {a.dueAt
                  ? `AI proposed ${a.dueAt}; verify against the source.`
                  : __pulseText("No certain deadline was supplied.")}{" "}
                {__pulseText("Choose the actual due date below (device time).")}</p>
              <label className="field">
                <span>{__pulseText("Reviewed due date") + " "}{i + 1}</span>
                <input name="due" type="datetime-local" required />
              </label>
              <button
                className="button primary"
                disabled={saving || !p.settings.ai.enabled}
              >
                {__pulseText("Save reviewed task")}</button>
              <button
                type="button"
                className="button ghost"
                onClick={() => setSaved((v) => [...v, i])}
              >
                {__pulseText("Reject proposal")}</button>
            </>
          )}
        </form>
      ))}
    </>
  );
}
