import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import {
  builtInLists,
  listMatcher,
  companyListMatcher,
} from "../services/smart-lists";
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
  pipelineId: "Pipeline",
  customField: "Custom field",
  pinned: "Pinned to Focus",
  industry: "Company industry",
  representativePriority: "Representative priority",
  noRepresentatives: "Without active representatives",
  closingSoon: "Upcoming opportunity deadline",
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
  const isCompany =
    typeof list !== "string" && list.entityType === "organization";
  const companyMatch = companyListMatcher(p);
  const matches = isCompany
    ? p.organizations.filter((o) => companyMatch(o, list as SmartList))
    : p.contacts.filter((c) => matcher(c, list));
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
              entityType: "contact",
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
                  {l.name} ·{" "}
                  {l.entityType === "organization"
                    ? p.organizations.filter((o) => companyMatch(o, l)).length
                    : p.contacts.filter((c) => matcher(c, l)).length}{" "}
                  · {l.entityType === "organization" ? "companies" : "people"}
                </option>
              ))}
            </select>
          </label>
          {typeof list !== "string" && (
            <div className="surface">
              <h2>{list.name}</h2>
              {list.conditions.some(
                (r) =>
                  r.field === "customField" &&
                  !p.fieldDefinitions.some(
                    (f) => f.id === r.fieldId && !f.archived,
                  ),
              ) && (
                <p role="status">
                  Invalid condition: a custom field was archived or deleted.
                  Edit this list to repair it.
                </p>
              )}
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
          <h2>
            {matches.length} matching {isCompany ? "companies" : "people"}
          </h2>
          {matches.slice(0, limit).map((c) => (
            <Link
              key={c.id}
              className="representative-row"
              to={`/network/${isCompany ? "companies" : "people"}/${c.id}`}
            >
              <Avatar name={c.name} />
              <div>
                <strong>{c.name}</strong>
                <span>
                  {"role" in c ? c.role : c.industry} ·{" "}
                  {p.organizations.find(
                    (o) =>
                      o.id ===
                      ("organizationId" in c ? c.organizationId : c.id),
                  )?.name || "Independent"}
                </span>
              </div>
              <Badge>{"stage" in c ? c.stage : "Company"}</Badge>
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
  const [entityType, setEntityType] = useState(record.entityType || "contact");
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
    opportunityStage: p.pipelineStages.map((s) => s.id),
    pipelineId: p.pipelines.map((s) => s.id),
    pinned: ["true", "false"],
    noRepresentatives: ["true", "false"],
    closingSoon: ["true"],
    representativePriority: priorities,
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
          entityType,
        });
        onSaved(record.id);
      }}
    >
      <Field label="List contains" wide>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value as typeof entityType)}
        >
          <option value="contact">People</option>
          <option value="organization">Companies</option>
        </select>
      </Field>
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
              {filterFields
                .filter((f) =>
                  entityType === "organization"
                    ? [
                        "industry",
                        "tag",
                        "daysSince",
                        "taskState",
                        "opportunityStatus",
                        "opportunityStage",
                        "pipelineId",
                        "customField",
                        "pinned",
                        "representativePriority",
                        "noRepresentatives",
                        "closingSoon",
                      ].includes(f)
                    : ![
                        "industry",
                        "representativePriority",
                        "noRepresentatives",
                        "closingSoon",
                      ].includes(f),
                )
                .map((f) => (
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
                : r.field === "customField"
                  ? [
                      "is",
                      "isNot",
                      "contains",
                      "atLeast",
                      "atMost",
                      "before",
                      "after",
                    ]
                  : r.field === "industry"
                    ? ["is", "contains"]
                    : r.field === "tag"
                      ? ["contains", "is"]
                      : ["is"]
              ).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          {r.field === "customField" && (
            <Field label={`Custom field ${i + 1}`}>
              <select
                required
                value={r.fieldId || ""}
                onChange={(e) =>
                  setRules(
                    rules.map((v, index) =>
                      index === i ? { ...v, fieldId: e.target.value } : v,
                    ),
                  )
                }
              >
                <option value="">Choose field</option>
                {p.fieldDefinitions
                  .filter((f) => f.entityType === entityType && !f.archived)
                  .map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label} · {f.type}
                    </option>
                  ))}
              </select>
            </Field>
          )}
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
                  <option key={v} value={v}>
                    {r.field === "pipelineId"
                      ? p.pipelines.find((x) => x.id === v)?.name
                      : r.field === "opportunityStage"
                        ? p.pipelineStages.find((x) => x.id === v)?.name
                        : v}
                  </option>
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
