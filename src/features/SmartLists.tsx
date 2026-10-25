import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { builtInLists, listMatcher } from "../services/smart-lists";
import {
  categories,
  stages,
  priorities,
  availabilities,
  healthStates,
  filterFields,
  stamp,
  smartListSchema,
  type SmartList,
} from "../data/models";
import { saveSmartList, deleteSmartList } from "../data/repository";
import { Field, RecordForm } from "../components/record-editors";
import { Avatar, Badge, Empty } from "../components/ui";
const labels: Record<(typeof filterFields)[number], string> = {
  category: "Relationship category",
  stage: "Lifecycle stage",
  priority: "Priority",
  availability: "Availability",
  organizationId: "Company",
  tag: "Tag",
  daysSince: "Days since recorded contact",
  health: "Relationship health",
  taskState: "Follow-up state",
  opportunityStatus: "Opportunity status",
  opportunityStage: "Opportunity stage",
};
export function SmartLists() {
  const p = usePulse(),
    [selected, setSelected] = useState("all"),
    [editing, setEditing] = useState<SmartList | null>(null),
    [limit, setLimit] = useState(30);
  const matcher = listMatcher(p),
    list = p.smartLists.find((l) => l.id === selected) || selected;
  const matches = p.contacts.filter((c) => matcher(c, list));
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">A NETWORK THAT MAKES SENSE</p>
          <h1>
            Your Smart Lists<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Saved conditions, live relationships. Your lists update as your
            records change.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setEditing({
              ...stamp(),
              name: "",
              mode: "all",
              conditions: [
                { field: "priority", operator: "is", value: "High" },
              ],
            })
          }
        >
          Create Smart List
        </button>
      </div>
      <div className="smart-layout">
        <section>
          <label className="field">
            <span>Choose a Smart List</span>
            <select
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setLimit(30);
              }}
            >
              {builtInLists.map(([key, name]) => (
                <option value={key} key={key}>
                  {name} · {p.contacts.filter((c) => matcher(c, key)).length}
                </option>
              ))}
              {p.smartLists.map((l) => (
                <option value={l.id} key={l.id}>
                  {l.name} · {p.contacts.filter((c) => matcher(c, l)).length}
                </option>
              ))}
            </select>
          </label>
          {typeof list !== "string" && (
            <div className="surface">
              <h2>{list.name}</h2>
              <p>
                {smartListSchema.safeParse(list).success
                  ? `${list.mode.toUpperCase()} conditions: ${list.conditions.map((r) => `${labels[r.field]} ${r.operator} ${r.value || "no company"}`).join(" · ")}`
                  : "Unsupported saved definition. Edit this list to repair it."}
              </p>
              <button
                className="button secondary"
                onClick={() => setEditing(list)}
              >
                Edit / rename list
              </button>
            </div>
          )}
          <Link className="button ghost" to="/review">
            Relationship Review
          </Link>
        </section>
        <section className="surface">
          <h2>{matches.length} matching people</h2>
          {matches.slice(0, limit).map((c) => (
            <Link
              key={c.id}
              className="representative-row"
              to={`/network/people/${c.id}`}
            >
              <Avatar name={c.name} />
              <div>
                <strong>{c.name}</strong>
                <span>
                  {c.role} ·{" "}
                  {p.organizations.find((o) => o.id === c.organizationId)
                    ?.name || "Independent"}
                </span>
              </div>
              <Badge>{c.stage}</Badge>
            </Link>
          ))}
          {!matches.length && (
            <Empty
              title="No matches right now"
              body="This list will update when records meet its conditions."
            />
          )}
          {matches.length > limit && (
            <button
              className="button secondary"
              onClick={() => setLimit(limit + 30)}
            >
              Show more people
            </button>
          )}
        </section>
      </div>
      {editing && (
        <SmartListEditor
          record={editing}
          onClose={() => setEditing(null)}
          onSaved={(id) => setSelected(id)}
        />
      )}
    </div>
  );
}
function SmartListEditor({
  record,
  onClose,
  onSaved,
}: {
  record: SmartList;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const p = usePulse(),
    [rules, setRules] = useState<SmartList["conditions"]>(
      smartListSchema.safeParse(record).success
        ? record.conditions
        : [{ field: "priority", operator: "is", value: "High" }],
    );
  const options: Partial<
    Record<(typeof filterFields)[number], readonly string[]>
  > = {
    category: categories,
    stage: stages,
    priority: priorities,
    availability: availabilities,
    health: healthStates,
    taskState: ["Due today", "Overdue", "Upcoming", "Completed", "None"],
    opportunityStatus: ["open", "won", "lost", "none"],
    opportunityStage: stages,
  };
  return (
    <RecordForm
      title="Smart List conditions"
      onClose={onClose}
      deleteLabel="Delete Smart List"
      onDelete={
        p.smartLists.some((l) => l.id === record.id)
          ? async () => {
              await deleteSmartList(p.db, record.id);
              onSaved("all");
            }
          : undefined
      }
      onSave={async (d) => {
        await saveSmartList(p.db, {
          ...record,
          name: String(d.get("name")),
          mode: String(d.get("mode")) as "all",
          conditions: rules,
        });
        onSaved(record.id);
      }}
    >
      <Field label="List name" wide>
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={record.name}
        />
      </Field>
      <Field label="Match" wide>
        <select name="mode" defaultValue={record.mode}>
          <option value="all">ALL conditions</option>
          <option value="any">ANY condition</option>
        </select>
      </Field>
      {rules.map((r, i) => (
        <fieldset className="condition-row wide" key={i}>
          <legend>Condition {i + 1}</legend>
          <Field label={`Field ${i + 1}`}>
            <select
              value={r.field}
              onChange={(e) => {
                const field = e.target.value as typeof r.field;
                setRules(
                  rules.map((v, index) =>
                    index === i
                      ? {
                          field,
                          operator:
                            field === "daysSince"
                              ? "atLeast"
                              : field === "tag"
                                ? "contains"
                                : "is",
                          value:
                            options[field]?.[0] ||
                            (field === "daysSince" ? "14" : ""),
                        }
                      : v,
                  ),
                );
              }}
            >
              {filterFields.map((f) => (
                <option value={f} key={f}>
                  {labels[f]}
                </option>
              ))}
            </select>
          </Field>
          <Field label={`Comparison ${i + 1}`}>
            <select
              value={r.operator}
              onChange={(e) =>
                setRules(
                  rules.map((v, index) =>
                    index === i
                      ? { ...v, operator: e.target.value as typeof r.operator }
                      : v,
                  ),
                )
              }
            >
              {(r.field === "daysSince"
                ? ["atLeast", "atMost"]
                : r.field === "tag"
                  ? ["contains", "is"]
                  : ["is"]
              ).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label={`Value ${i + 1}`}>
            {r.field === "organizationId" ? (
              <select
                value={r.value}
                onChange={(e) =>
                  setRules(
                    rules.map((v, index) =>
                      index === i ? { ...v, value: e.target.value } : v,
                    ),
                  )
                }
              >
                <option value="">No company</option>
                {p.organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            ) : options[r.field] ? (
              <select
                value={r.value}
                onChange={(e) =>
                  setRules(
                    rules.map((v, index) =>
                      index === i ? { ...v, value: e.target.value } : v,
                    ),
                  )
                }
              >
                {options[r.field]!.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            ) : (
              <input
                type={r.field === "daysSince" ? "number" : "text"}
                min={0}
                max={36500}
                required
                value={r.value}
                onChange={(e) =>
                  setRules(
                    rules.map((v, index) =>
                      index === i ? { ...v, value: e.target.value } : v,
                    ),
                  )
                }
              />
            )}
          </Field>
          {rules.length > 1 && (
            <button
              type="button"
              className="button ghost destructive"
              onClick={() => setRules(rules.filter((_, index) => index !== i))}
            >
              Remove condition {i + 1}
            </button>
          )}
        </fieldset>
      ))}
      {rules.length < 10 && (
        <button
          type="button"
          className="button secondary wide"
          onClick={() =>
            setRules([
              ...rules,
              { field: "stage", operator: "is", value: "Proposal" },
            ])
          }
        >
          Add condition
        </button>
      )}
      <p className="wide field-help">
        Days-since conditions exclude unknown history. Paused and restricted
        classifications are calculated from active instructions and permissions.
        Lists never grant outreach permission.
      </p>
    </RecordForm>
  );
}
