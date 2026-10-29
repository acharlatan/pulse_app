import { useInterfaceText } from "../i18n/useInterfaceText";
import { useState } from "react";
import { usePulse } from "../app/context";
import type { FieldDefinition, FieldValue } from "../data/expansion-models";
import { saveFieldValues } from "../data/expansion-repository";
import { RecordForm, Field } from "./record-editors";
export function CustomFields({
  type,
  id,
}: {
  type: FieldDefinition["entityType"];
  id: string;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse(),
    [open, setOpen] = useState(false);
  const fields = p.fieldDefinitions.filter(
    (f) => f.entityType === type && !f.archived && f.visible,
  );
  const values = p.fieldValues.filter((v) => v.recordId === id);
  return (
    <section className="surface">
      <h2>{__pulseText("Additional details")}</h2>
      {fields
        .filter((f) => values.some((v) => v.fieldId === f.id))
        .map((f) => (
          <p key={f.id}>
            <strong>{f.label}: </strong>
            {String(values.find((v) => v.fieldId === f.id)?.value ?? "")}
          </p>
        ))}
      {!fields.length ? (
        <p className="muted">
          {__pulseText("Create custom fields in Settings → Personalize PULSE.")}</p>
      ) : (
        <button className="button secondary" onClick={() => setOpen(true)}>
          {__pulseText("Edit additional details")}</button>
      )}
      {open && (
        <ValuesEditor type={type} id={id} onClose={() => setOpen(false)} />
      )}
    </section>
  );
}
function ValuesEditor({
  type,
  id,
  onClose,
}: {
  type: FieldDefinition["entityType"];
  id: string;
  onClose: () => void;
}) {
  const __pulseText = useInterfaceText();
  const p = usePulse();
  const [snapshot] = useState(() =>
    JSON.stringify(p.fieldValues.filter((v) => v.recordId === id)),
  );
  const [definitions] = useState(() =>
    p.fieldDefinitions.filter(
      (f) => f.entityType === type && !f.archived && f.visible,
    ),
  );
  const [values, setValues] = useState<Record<string, FieldValue["value"]>>(
    () =>
      Object.fromEntries(
        p.fieldValues
          .filter((v) => v.recordId === id)
          .map((v) => [v.fieldId, v.value]),
      ),
  );
  return (
    <RecordForm
      title={__pulseText("Additional relationship details")}
      onClose={onClose}
      onSave={async () => {
        if (
          definitions.some(
            (f) =>
              p.fieldDefinitions.find((x) => x.id === f.id)?.updatedAt !==
              f.updatedAt,
          )
        )
          throw new Error("Field definitions changed. Reopen this editor.");
        await saveFieldValues(
          p.db,
          type,
          id,
          definitions.map((f) => ({
            fieldId: f.id,
            value:
              values[f.id] === "" || values[f.id] === undefined
                ? null
                : values[f.id],
          })),
          snapshot,
        );
      }}
    >
      {definitions.map((f) => (
        <Field key={f.id} label={f.label} wide>
          <small>{f.description}</small>
          {f.type === "checkbox" ? (
            <select
              value={values[f.id] === undefined ? "" : String(values[f.id])}
              onChange={(e) =>
                setValues({
                  ...values,
                  [f.id]:
                    e.target.value === "" ? "" : e.target.value === "true",
                })
              }
            >
              <option value="">{__pulseText("Not set")}</option>
              <option value="true">{__pulseText("Yes")}</option>
              <option value="false">{__pulseText("No")}</option>
            </select>
          ) : f.type === "select" ? (
            <select
              value={String(values[f.id] ?? "")}
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
            >
              <option value="">{__pulseText("Not set")}</option>
              {f.choices.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          ) : f.type === "longText" ? (
            <textarea
              maxLength={10000}
              value={String(values[f.id] ?? "")}
              onChange={(e) => setValues({ ...values, [f.id]: e.target.value })}
            />
          ) : (
            <input
              type={
                f.type === "number"
                  ? "number"
                  : f.type === "date"
                    ? "date"
                    : "text"
              }
              maxLength={300}
              step="any"
              value={String(values[f.id] ?? "")}
              onChange={(e) =>
                setValues({
                  ...values,
                  [f.id]:
                    f.type === "number" && e.target.value !== ""
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          )}
        </Field>
      ))}
    </RecordForm>
  );
}
