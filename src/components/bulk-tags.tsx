import { useInterfaceText } from "../i18n/useInterfaceText";
import { useState } from "react";
import { usePulse } from "../app/context";
import { bulkTag } from "../data/expansion-repository";
import { Modal } from "./ui";
export function BulkTags({
  type,
  records,
}: {
  type: "contact" | "organization";
  records: { id: string; updatedAt: string; name: string }[];
}) {
  const __pulseText = useInterfaceText();
  const [operation, setOperation] = useState<
    "addTag" | "removeTag" | "priority" | "pin" | "unpin"
  >("addTag");
  const p = usePulse(),
    [open, setOpen] = useState(false),
    [selected, setSelected] = useState<{ id: string; updatedAt: string }[]>([]),
    [tag, setTag] = useState(""),
    [review, setReview] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <>
      <button
        className="button secondary"
        onClick={() => {
          setSelected([]);
          setReview(false);
          setOpen(true);
        }}
      >
        {__pulseText("Bulk add tag")}</button>
      {open && (
        <Modal
          title={__pulseText("Tag selected records")}
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            {__pulseText("Administrative tags only. Availability and communication permissions stay authoritative. No messages or XP are generated.")}</p>
          {!review ? (
            <>
              <label className="field">
                <span>{__pulseText("Bulk action")}</span>
                <select
                  value={operation}
                  onChange={(e) => {
                    setOperation(e.target.value as typeof operation);
                    setTag(
                      ["pin", "unpin"].includes(e.target.value)
                        ? "Focus"
                        : e.target.value === "priority"
                          ? "Normal"
                          : "",
                    );
                  }}
                >
                  <option value="addTag">{__pulseText("Add tag")}</option>
                  <option value="removeTag">{__pulseText("Remove tag")}</option>
                  {type === "contact" && (
                    <option value="priority">{__pulseText("Assign priority")}</option>
                  )}
                  <option value="pin">{__pulseText("Pin to My Focus")}</option>
                  <option value="unpin">{__pulseText("Unpin from My Focus")}</option>
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Tag")}</span>
                <input
                  value={tag}
                  maxLength={100}
                  onChange={(e) => setTag(e.target.value)}
                />
              </label>
              <p>
                {__pulseText("Select from the first 200 filtered records. Narrow your directory search for other records.")}</p>
              <div className="form-actions">
                <button
                  type="button"
                  className="button ghost"
                  onClick={() =>
                    setSelected(
                      records
                        .slice(0, 200)
                        .map((r) => ({ id: r.id, updatedAt: r.updatedAt })),
                    )
                  }
                >
                  {__pulseText("Select visible results")}</button>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setSelected([])}
                >
                  {__pulseText("Clear selection")}</button>
              </div>
              {records.slice(0, 200).map((r) => (
                <label className="bulk-option" key={r.id}>
                  <input
                    type="checkbox"
                    checked={selected.some((x) => x.id === r.id)}
                    onChange={(e) =>
                      setSelected(
                        e.target.checked
                          ? [...selected, { id: r.id, updatedAt: r.updatedAt }]
                          : selected.filter((x) => x.id !== r.id),
                      )
                    }
                  />
                  <span>{r.name}</span>
                </label>
              ))}
              <button
                className="button primary"
                disabled={!tag.trim() || !selected.length}
                onClick={() => setReview(true)}
              >
                {__pulseText("Review") + " "}{selected.length} {" " + __pulseText("selected records")}</button>
            </>
          ) : (
            <>
              <p>
                {operation}: “{tag}{__pulseText("” on exactly") + " "}{selected.length} {" " + __pulseText("selected records?")}</p>
              <ul>
                {selected.map((s) => (
                  <li key={s.id}>
                    {records.find((r) => r.id === s.id)?.name ||
                      __pulseText("Record no longer in this view")}
                  </li>
                ))}
              </ul>
              <div className="form-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setReview(false)}
                >
                  {__pulseText("Back")}</button>
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const count = await bulkTag(
                        p.db,
                        type,
                        selected,
                        tag,
                        operation,
                      );
                      p.notify(`${operation} completed for ${count} records`);
                      setOpen(false);
                    } catch (e) {
                      setError(
                        e instanceof Error ? e.message : "Could not apply tag",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {__pulseText("Confirm tag update")}</button>
              </div>
            </>
          )}
          {error && <p role="alert">{__pulseText(error)}</p>}
        </Modal>
      )}
    </>
  );
}
