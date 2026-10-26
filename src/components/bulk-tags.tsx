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
        Bulk add tag
      </button>
      {open && (
        <Modal
          title="Tag selected records"
          onClose={() => {
            if (!busy) setOpen(false);
          }}
        >
          <p>
            Administrative tags only. Availability and communication permissions
            stay authoritative. No messages or XP are generated.
          </p>
          {!review ? (
            <>
              <label className="field">
                <span>Bulk action</span>
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
                  <option value="addTag">Add tag</option>
                  <option value="removeTag">Remove tag</option>
                  {type === "contact" && (
                    <option value="priority">Assign priority</option>
                  )}
                  <option value="pin">Pin to My Focus</option>
                  <option value="unpin">Unpin from My Focus</option>
                </select>
              </label>
              <label className="field">
                <span>Tag</span>
                <input
                  value={tag}
                  maxLength={100}
                  onChange={(e) => setTag(e.target.value)}
                />
              </label>
              <p>
                Select from the first 200 filtered records. Narrow your
                directory search for other records.
              </p>
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
                  Select visible results
                </button>
                <button
                  type="button"
                  className="button ghost"
                  onClick={() => setSelected([])}
                >
                  Clear selection
                </button>
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
                Review {selected.length} selected records
              </button>
            </>
          ) : (
            <>
              <p>
                {operation}: “{tag}” on exactly {selected.length} selected
                records?
              </p>
              <ul>
                {selected.map((s) => (
                  <li key={s.id}>
                    {records.find((r) => r.id === s.id)?.name ||
                      "Record no longer in this view"}
                  </li>
                ))}
              </ul>
              <div className="form-actions">
                <button
                  className="button secondary"
                  disabled={busy}
                  onClick={() => setReview(false)}
                >
                  Back
                </button>
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
                  Confirm tag update
                </button>
              </div>
            </>
          )}
          {error && <p role="alert">{error}</p>}
        </Modal>
      )}
    </>
  );
}
