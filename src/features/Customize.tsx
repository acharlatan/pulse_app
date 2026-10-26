import { useState } from "react";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { stamp } from "../data/models";
import {
  savePipeline,
  deletePipeline,
  saveField,
  deleteField,
} from "../data/expansion-repository";
import {
  type PipelineDefinition,
  type PipelineStage,
} from "../services/pipelines";
import type { FieldDefinition } from "../data/expansion-models";
import { RecordForm, Field } from "../components/record-editors";
const templates: Record<string, [string, string, string][]> = {
  Sales: [
    ["Prospect", "open", "#7161e8"],
    ["Discovery", "open", "#7161e8"],
    ["Proposal", "open", "#7161e8"],
    ["Won", "won", "#22824e"],
    ["Lost", "lost", "#c34e56"],
  ],
  Partnerships: [
    ["Potential Partner", "open", "#7161e8"],
    ["Introduction", "open", "#7161e8"],
    ["Initial Discussion", "open", "#7161e8"],
    ["Collaboration Review", "open", "#7161e8"],
    ["Agreement Pending", "open", "#7161e8"],
    ["Active Partnership", "won", "#22824e"],
    ["Declined", "lost", "#c34e56"],
  ],
  Recruitment: [
    ["Candidate identified", "open", "#7161e8"],
    ["Screening", "open", "#7161e8"],
    ["Interview", "open", "#7161e8"],
    ["Placed", "won", "#22824e"],
    ["Closed", "lost", "#c34e56"],
  ],
  "Client Projects": [
    ["Inquiry", "open", "#7161e8"],
    ["Qualification", "open", "#7161e8"],
    ["Proposal sent", "open", "#7161e8"],
    ["Onboarding", "open", "#7161e8"],
    ["Active engagement", "won", "#22824e"],
    ["Closed", "lost", "#c34e56"],
  ],
  Blank: [
    ["Open", "open", "#7161e8"],
    ["Won", "won", "#22824e"],
    ["Lost", "lost", "#c34e56"],
  ],
};
export function Customize() {
  const p = usePulse(),
    [pipeline, setPipeline] = useState<PipelineDefinition | null>(null),
    [field, setField] = useState<FieldDefinition | null>(null),
    [template, setTemplate] = useState("Partnerships");
  return (
    <div className="page customize-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">SIMPLE BY DEFAULT. FLEXIBLE WHEN NEEDED.</p>
          <h1>
            Personalize PULSE<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Shape your workflows without changing your relationships.
          </p>
        </div>
      </div>
      <Link className="button ghost" to="/pipeline">
        Back to Pipeline
      </Link>
      <section className="surface">
        <h2>Pipelines & workflows</h2>
        <p>
          Up to 12 active pipelines, with 24 stages each. Every pipeline
          includes open, won and lost outcomes. Archive to preserve history.
        </p>
        <div className="form-actions">
          <label className="field">
            <span>Pipeline template</span>
            <select
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
            >
              {Object.keys(templates).map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <button
            className="button primary"
            onClick={() =>
              setPipeline({
                ...stamp(),
                name: "",
                description: "",
                position: p.pipelines.length,
                color: "#7161e8",
                isDefault: false,
                archived: false,
              })
            }
          >
            Create pipeline
          </button>
        </div>
        {p.pipelines.map((x) => (
          <article className="focus-row" key={x.id}>
            <div>
              <strong>{x.name}</strong>
              <p>
                {x.isDefault ? "Default · " : ""}
                {x.archived ? "Archived · " : ""}
                {
                  p.opportunities.filter((o) => o.pipelineId === x.id).length
                }{" "}
                opportunities
              </p>
            </div>
            <button className="button secondary" onClick={() => setPipeline(x)}>
              Manage {x.name}
            </button>
          </article>
        ))}
      </section>
      <section className="surface">
        <h2>Custom fields</h2>
        <p>
          Up to 30 fields per record type. Types stay fixed after creation.
          Archive to keep values; deletion removes values after confirmation.
        </p>
        <button
          className="button primary"
          onClick={() =>
            setField({
              ...stamp(),
              entityType: "organization",
              label: "",
              description: "",
              type: "text",
              choices: [],
              position: p.fieldDefinitions.length,
              visible: true,
              archived: false,
            })
          }
        >
          Create custom field
        </button>
        {p.fieldDefinitions.map((f) => (
          <article className="focus-row" key={f.id}>
            <div>
              <strong>{f.label}</strong>
              <p>
                {f.entityType} · {f.type}
                {f.archived ? " · Archived" : ""}
              </p>
            </div>
            <button className="button secondary" onClick={() => setField(f)}>
              Edit {f.label}
            </button>
          </article>
        ))}
      </section>
      <section className="surface">
        <h2>Your daily workspace</h2>
        <div className="form-grid">
          <Field label="Home layout">
            <select
              value={p.settings.focus.homeLayout}
              onChange={(e) =>
                void p.run(
                  () =>
                    p.setSettings({
                      focus: {
                        ...p.settings.focus,
                        homeLayout: e.target.value as "balanced",
                      },
                    }),
                  "Layout saved",
                )
              }
            >
              <option value="balanced">Balanced</option>
              <option value="focused">Focused</option>
              <option value="compact">Compact</option>
            </select>
          </Field>
          <Field label="Default landing screen">
            <select
              value={p.settings.focus.landing}
              onChange={(e) =>
                void p.run(
                  () =>
                    p.setSettings({
                      focus: {
                        ...p.settings.focus,
                        landing: e.target.value as "home",
                      },
                    }),
                  "Landing screen saved",
                )
              }
            >
              <option value="home">Home</option>
              <option value="focus">My Focus</option>
            </select>
          </Field>
          {(
            [
              ["shortcuts", "Show My Focus on Home"],
              ["progress", "Show progress in My Focus"],
              ["reminders", "Focus in-app reminders"],
            ] as const
          ).map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                type="checkbox"
                checked={p.settings.focus[key]}
                onChange={(e) =>
                  void p.run(
                    () =>
                      p.setSettings({
                        focus: { ...p.settings.focus, [key]: e.target.checked },
                      }),
                    "Preference saved",
                  )
                }
              />
            </label>
          ))}
        </div>
        <p className="muted">
          Reminders appear only while PULSE is open. Focus selections never earn
          XP.
        </p>
      </section>
      {pipeline && (
        <PipelineEditor
          key={pipeline.id}
          record={pipeline}
          template={template}
          onClose={() => setPipeline(null)}
        />
      )}
      {field && (
        <FieldEditor
          key={field.id}
          record={field}
          onClose={() => setField(null)}
        />
      )}
    </div>
  );
}
function PipelineEditor({
  record,
  template,
  onClose,
}: {
  record: PipelineDefinition;
  template: string;
  onClose: () => void;
}) {
  const p = usePulse(),
    exists = p.pipelines.some((x) => x.id === record.id);
  const [rows, setRows] = useState<PipelineStage[]>(() =>
    exists
      ? p.pipelineStages
          .filter((s) => s.pipelineId === record.id)
          .map((s) => ({ ...s }))
      : templates[template].map(([name, category, color], position) => ({
          ...stamp(),
          pipelineId: record.id,
          name,
          category: category as PipelineStage["category"],
          color,
          position,
        })),
  );
  const [mappings, setMappings] = useState<Record<string, string>>({}),
    [confirmed, setConfirmed] = useState(false);
  const original = p.pipelineStages.filter((s) => s.pipelineId === record.id);
  const removed = original.filter((s) => !rows.some((r) => r.id === s.id));
  const affected = p.opportunities.filter(
    (o) =>
      o.pipelineId === record.id &&
      (mappings[o.stageId] ||
        !rows.some((r) => r.id === o.stageId) ||
        rows.find((r) => r.id === o.stageId)?.category !== o.status),
  );
  function change(i: number, patch: Partial<PipelineStage>) {
    setConfirmed(false);
    setRows(rows.map((s, n) => (n === i ? { ...s, ...patch } : s)));
  }
  function reorder(i: number, dir: number) {
    const next = [...rows];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    setRows(next);
  }
  return (
    <RecordForm
      title={exists ? "Manage pipeline" : "Create pipeline"}
      onClose={onClose}
      onDelete={
        exists &&
        !record.isDefault &&
        !p.opportunities.some((o) => o.pipelineId === record.id)
          ? () => deletePipeline(p.db, record.id, record.updatedAt)
          : undefined
      }
      deleteLabel="Delete empty pipeline"
      onSave={async (d) => {
        await savePipeline(
          p.db,
          {
            ...record,
            name: String(d.get("name")),
            description: String(d.get("description")),
            color: String(d.get("color")),
            isDefault: d.has("default"),
            archived: d.has("archived"),
          },
          rows.map((s, position) => ({ ...s, position })),
          exists ? record.updatedAt : undefined,
          mappings,
          confirmed,
        );
      }}
    >
      <Field label="Pipeline name" wide>
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={record.name}
        />
      </Field>
      <Field label="Description" wide>
        <textarea
          name="description"
          maxLength={2000}
          defaultValue={record.description}
        />
      </Field>
      <Field label="Pipeline color">
        <input name="color" type="color" defaultValue={record.color} />
      </Field>
      <label className="field">
        <span>Default pipeline</span>
        <input
          name="default"
          type="checkbox"
          defaultChecked={record.isDefault}
        />
      </label>
      <label className="field">
        <span>Archive pipeline</span>
        <input
          name="archived"
          type="checkbox"
          defaultChecked={record.archived}
        />
        <small>
          Archived records remain readable. Select another default first.
        </small>
      </label>
      {rows.map((s, i) => (
        <fieldset className="wide stage-editor" key={s.id}>
          <legend>Stage {i + 1}</legend>
          <div className="form-grid">
            <Field label={`Stage ${i + 1} name`}>
              <input
                required
                maxLength={100}
                value={s.name}
                onChange={(e) => change(i, { name: e.target.value })}
              />
            </Field>
            <Field label={`Stage ${i + 1} outcome`}>
              <select
                value={s.category}
                onChange={(e) =>
                  change(i, {
                    category: e.target.value as PipelineStage["category"],
                  })
                }
              >
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </Field>
            <Field label={`Stage ${i + 1} color`}>
              <input
                type="color"
                value={s.color}
                onChange={(e) => change(i, { color: e.target.value })}
              />
            </Field>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button ghost"
              disabled={i === 0}
              onClick={() => reorder(i, -1)}
            >
              Move up
            </button>
            <button
              type="button"
              className="button ghost"
              disabled={i === rows.length - 1}
              onClick={() => reorder(i, 1)}
            >
              Move down
            </button>
            <button
              type="button"
              className="button ghost destructive"
              onClick={() => {
                setRows(rows.filter((x) => x.id !== s.id));
                setConfirmed(false);
              }}
            >
              Remove stage
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="button secondary wide"
        disabled={rows.length >= 24}
        onClick={() =>
          setRows([
            ...rows,
            {
              ...stamp(),
              pipelineId: record.id,
              name: "New stage",
              category: "open",
              position: rows.length,
              color: record.color,
            },
          ])
        }
      >
        Add stage
      </button>
      {removed.map((s) => (
        <Field key={s.id} label={`Replace removed stage: ${s.name}`} wide>
          <p>
            {p.opportunities.filter((o) => o.stageId === s.id).length} affected
            opportunities
          </p>
          <select
            value={mappings[s.id] || ""}
            onChange={(e) => {
              setMappings({ ...mappings, [s.id]: e.target.value });
              setConfirmed(false);
            }}
          >
            <option value="">Choose replacement for used stage</option>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.category}
              </option>
            ))}
          </select>
        </Field>
      ))}
      {!!affected.length && (
        <label className="field wide">
          <strong>
            Impact preview: {affected.length} opportunities change stage or
            outcome.
          </strong>
          <p>
            Open stages reopen closed deals and reverse applicable XP.
            Configuration changes grant no new XP. Cancel leaves records
            unchanged.
          </p>
          <span>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            Confirm these mappings and outcome changes
          </span>
        </label>
      )}
    </RecordForm>
  );
}
function FieldEditor({
  record,
  onClose,
}: {
  record: FieldDefinition;
  onClose: () => void;
}) {
  const p = usePulse(),
    exists = p.fieldDefinitions.some((f) => f.id === record.id),
    [type, setType] = useState(record.type);
  const count = p.fieldValues.filter((v) => v.fieldId === record.id).length;
  return (
    <RecordForm
      title="Custom field definition"
      onClose={onClose}
      deleteLabel={`Permanently delete field and ${count} values`}
      onDelete={
        exists
          ? () => deleteField(p.db, record.id, record.updatedAt, count)
          : undefined
      }
      onSave={(d) =>
        saveField(
          p.db,
          {
            ...record,
            label: String(d.get("label")),
            description: String(d.get("description")),
            entityType: String(
              d.get("entityType"),
            ) as FieldDefinition["entityType"],
            type,
            choices: String(d.get("choices") || "")
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
            position: Number(d.get("position")),
            visible: d.has("visible"),
            archived: d.has("archived"),
          },
          exists ? record.updatedAt : undefined,
        )
      }
    >
      <Field label="Field label" wide>
        <input
          name="label"
          required
          maxLength={80}
          defaultValue={record.label}
        />
      </Field>
      <Field label="Record type">
        <select
          name="entityType"
          defaultValue={record.entityType}
          disabled={exists}
        >
          {["contact", "organization", "opportunity"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        {exists && (
          <input name="entityType" type="hidden" value={record.entityType} />
        )}
      </Field>
      <Field label="Field type">
        <select
          value={type}
          disabled={exists}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          {["text", "longText", "number", "date", "checkbox", "select"].map(
            (t) => (
              <option key={t}>{t}</option>
            ),
          )}
        </select>
      </Field>
      <Field label="Help text" wide>
        <textarea
          name="description"
          maxLength={500}
          defaultValue={record.description}
        />
      </Field>
      {type === "select" && (
        <Field label="Choices (one per line, up to 30)" wide>
          <textarea
            name="choices"
            required
            defaultValue={record.choices.join("\n")}
          />
        </Field>
      )}
      <Field label="Display order">
        <input
          name="position"
          type="number"
          min="0"
          required
          defaultValue={record.position}
        />
      </Field>
      <label className="field">
        <span>Visible in details</span>
        <input name="visible" type="checkbox" defaultChecked={record.visible} />
      </label>
      <label className="field">
        <span>Archive field (preserve values)</span>
        <input
          name="archived"
          type="checkbox"
          defaultChecked={record.archived}
        />
      </label>
      <p className="wide">
        {count} saved values. Renaming preserves them. Permanent deletion also
        removes these values; saved filters then show an invalid condition.
      </p>
    </RecordForm>
  );
}
