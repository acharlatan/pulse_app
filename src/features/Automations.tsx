import { BrandArt } from "../components/BrandArt";
import { useState, type FormEvent } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Link } from "react-router-dom";
import { usePulse } from "../app/context";
import { stamp, categories, priorities } from "../data/models";
import type { AutomationRule } from "../data/intelligence-models";
import {
  saveAutomationRule,
  setRuleEnabled,
  deleteAutomationRule,
  pauseAutomations,
  evaluateScheduledAutomations,
} from "../data/automation-repository";
import { Modal } from "../components/ui";
import { EditorModal, type Editor } from "../components/forms";
const triggers: Record<AutomationRule["trigger"], string> = {
  stage: "Opportunity enters a stage",
  closing: "Opportunity closing soon",
  due: "Follow-up due soon",
  overdue: "Follow-up becomes overdue",
  inactive: "Person reaches an inactivity threshold",
};
export function Automations() {
  const p = usePulse(),
    rules = useLiveQuery(() => p.db.automationRules.toArray(), [p.db]) || [],
    history =
      useLiveQuery(
        () =>
          p.db.automationExecutions.orderBy("at").reverse().limit(80).toArray(),
        [p.db],
      ) || [],
    state = useLiveQuery(
      () => p.db.automationControl.get("automation"),
      [p.db],
    );
  const [edit, setEdit] = useState<AutomationRule | null>(null),
    [deleting, setDeleting] = useState<AutomationRule | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recordEditor, setRecordEditor] = useState<Editor | null>(null);
  const visible = rules.filter((r) => !r.archived),
    pipelines = p.pipelines.filter((x) => !x.archived);
  function draft(template: "stage" | "closing" | "inactive" | "overdue") {
    const pipe = pipelines[0],
      stage =
        p.pipelineStages.find(
          (x) => x.pipelineId === pipe?.id && /proposal/i.test(x.name),
        ) ||
        p.pipelineStages.find(
          (x) => x.pipelineId === pipe?.id && x.category === "open",
        );
    const names = {
      stage: "Proposal follow-up",
      closing: "Closing soon review",
      inactive: "Reconnect review",
      overdue: "Overdue reminder",
    };
    return {
      ...stamp(),
      name: names[template],
      description: "",
      enabled: false,
      enabledAt: null,
      archived: false,
      trigger: template,
      pipelineId: template === "stage" ? pipe?.id || "" : "",
      stageId: template === "stage" ? stage?.id || "" : "",
      days: template === "inactive" ? 30 : 3,
      priority: "" as const,
      category: "",
      action:
        template === "stage" || template === "closing"
          ? ("task" as const)
          : ("reminder" as const),
      taskTitle:
        template === "stage"
          ? "Review proposal follow-up"
          : "Review this record",
      delayDays: 3,
    };
  }
  const update = (patch: Partial<AutomationRule>) =>
    setEdit((e) => (e ? { ...e, ...patch } : null));
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!edit || busy) return;
    setBusy(true);
    setError("");
    try {
      const old = rules.find((r) => r.id === edit.id);
      await saveAutomationRule(p.db, edit, old ? edit.updatedAt : undefined);
      p.notify("Rule saved as a disabled draft");
      setEdit(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save rule.");
    } finally {
      setBusy(false);
    }
  }
  const duplicate =
    edit &&
    visible.some(
      (r) =>
        r.id !== edit.id &&
        r.enabled &&
        r.trigger === edit.trigger &&
        r.pipelineId === edit.pipelineId &&
        r.stageId === edit.stageId &&
        r.action === edit.action &&
        r.days === edit.days &&
        r.priority === edit.priority &&
        r.category === edit.category,
    );
  return (
    <div className="page automations-page">
      <div className="page-heading studio-heading">
        <BrandArt motif="wave" />
        <div>
          <p className="eyebrow">LESS ADMIN, MORE TIME FOR PEOPLE</p>
          <h1>
            Automations<span className="accent">.</span>
          </h1>
          <p className="subtitle">
            Choose a trigger and a safe local action. You stay in control.
          </p>
        </div>
        <Link className="button secondary" to="/analytics">
          Open Analytics
        </Link>
      </div>
      <section className="surface">
        <h2>Runs when PULSE is open</h2>
        <p>
          Local checks run on opening, when you return to the app, and
          periodically while it is active. Closed-app delivery is not
          guaranteed. No rule sends messages or changes permissions.
        </p>
        <div className="form-actions">
          <button
            className="button secondary"
            onClick={() =>
              void p.run(
                () => pauseAutomations(p.db, !state?.paused),
                state?.paused
                  ? "Automations resumed; past conditions will not replay"
                  : "Automations paused",
              )
            }
          >
            {state?.paused ? "Resume all automations" : "Pause all automations"}
          </button>
          <button
            className="button ghost"
            onClick={() =>
              void p.run(
                () => evaluateScheduledAutomations(p.db),
                "Local checks finished",
              )
            }
          >
            Check eligible conditions now
          </button>
        </div>
        <p className="muted">
          Up to 30 rules; checks are bounded to keep your workspace responsive.
        </p>
        <p className="muted">
          {state?.paused
            ? "All rules are paused."
            : "Rules run only after you enable them. The latest 30 days of eligible missed checks may be considered; conditions before enabling, resuming or restoring never replay."}
        </p>
      </section>
      <section className="surface">
        <h2>Start with a template</h2>
        <p className="muted">
          Templates open as disabled drafts. Review and enable each rule
          yourself.
        </p>
        <div className="automation-templates">
          {(["stage", "closing", "inactive", "overdue"] as const).map((k) => (
            <button
              key={k}
              className="button secondary"
              onClick={() => {
                setError("");
                setEdit(draft(k));
              }}
            >
              {draft(k).name}
            </button>
          ))}
        </div>
      </section>
      <section className="surface">
        <h2>Your rules</h2>
        {!visible.length && (
          <p>No rules yet. Choose a template to make your first draft.</p>
        )}
        {visible.map((r) => (
          <article className="automation-rule" key={r.id}>
            <div>
              <h3>{r.name}</h3>
              <p>
                {triggers[r.trigger]} ·{" "}
                {r.action === "task"
                  ? "Create a follow-up"
                  : "Record an in-app reminder"}{" "}
                · {r.enabled ? "Enabled" : "Disabled draft"}
              </p>
              <small>{r.description}</small>
            </div>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => {
                  setError("");
                  setEdit({ ...r });
                }}
              >
                Edit
              </button>
              <button
                className="button secondary"
                onClick={() =>
                  void p.run(
                    () => setRuleEnabled(p.db, r.id, !r.enabled, r.updatedAt),
                    r.enabled
                      ? "Rule disabled"
                      : "Rule enabled for future occurrences",
                  )
                }
              >
                {r.enabled ? "Disable" : "Enable"}
              </button>
              <button
                className="button ghost"
                onClick={() => {
                  setError("");
                  setEdit({
                    ...r,
                    ...stamp(),
                    name: `${r.name} copy`,
                    enabled: false,
                    enabledAt: null,
                  });
                }}
              >
                Duplicate
              </button>
              <button
                className="button ghost destructive"
                onClick={() => setDeleting(r)}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
      </section>
      <section className="surface">
        <h2>Automation history</h2>
        <p className="muted">
          Latest 80 checks; duplicate-prevention records remain stored even when
          older items are not shown. Reminders are visible here while the app is
          open.
        </p>
        {!history.length && <p>No checks recorded yet.</p>}
        {history.map((h) => (
          <article key={h.id} className="automation-history">
            <strong>
              {rules.find((r) => r.id === h.ruleId)?.name || "Deleted rule"} ·{" "}
              {h.status}
            </strong>
            <p>{h.explanation}</p>
            <small>
              {new Date(h.at).toLocaleString(p.settings.locale, {
                timeZone: p.settings.timezone,
              })}
            </small>
            {h.resultId && p.tasks.some((t) => t.id === h.resultId) && (
              <button
                className="button ghost"
                onClick={() =>
                  setRecordEditor({
                    kind: "task",
                    record: p.tasks.find((t) => t.id === h.resultId)!,
                  })
                }
              >
                Open created follow-up
              </button>
            )}
            {h.resultId && h.resultDeleted && <span>Follow-up removed</span>}{" "}
            {h.sourceType === "contact" && (
              <Link to={`/network/people/${h.sourceId}`}>Open person</Link>
            )}
            {h.sourceType === "opportunity" &&
              p.opportunities.some((o) => o.id === h.sourceId) && (
                <button
                  className="button ghost"
                  onClick={() =>
                    setRecordEditor({
                      kind: "opportunity",
                      record: p.opportunities.find((o) => o.id === h.sourceId)!,
                    })
                  }
                >
                  Open opportunity
                </button>
              )}
            {h.sourceType === "task" &&
              p.tasks.some((t) => t.id === h.sourceId) && (
                <button
                  className="button ghost"
                  onClick={() =>
                    setRecordEditor({
                      kind: "task",
                      record: p.tasks.find((t) => t.id === h.sourceId)!,
                    })
                  }
                >
                  Open source follow-up
                </button>
              )}
          </article>
        ))}
      </section>
      {edit && (
        <Modal
          title={
            rules.some((r) => r.id === edit.id)
              ? "Edit automation draft"
              : "Create automation draft"
          }
          onClose={() => setEdit(null)}
        >
          <form onSubmit={(e) => void save(e)}>
            <p>
              Rules are saved disabled. Editing an enabled rule disables it
              until you review and enable it again.
            </p>
            <div className="form-grid">
              <label className="field wide">
                <span>Rule name</span>
                <input
                  required
                  maxLength={100}
                  value={edit.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label className="field wide">
                <span>Description (optional)</span>
                <input
                  maxLength={500}
                  value={edit.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </label>
              <label className="field">
                <span>When</span>
                <select
                  value={edit.trigger}
                  onChange={(e) =>
                    update({
                      trigger: e.target.value as AutomationRule["trigger"],
                    })
                  }
                >
                  {Object.entries(triggers).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {(edit.trigger === "stage" || edit.trigger === "closing") && (
                <label className="field">
                  <span>Pipeline</span>
                  <select
                    value={edit.pipelineId}
                    onChange={(e) => {
                      const id = e.target.value;
                      update({
                        pipelineId: id,
                        stageId:
                          p.pipelineStages.find((x) => x.pipelineId === id)
                            ?.id || "",
                      });
                    }}
                  >
                    <option value="">
                      {edit.trigger === "stage"
                        ? "Choose pipeline"
                        : "Any pipeline"}
                    </option>
                    {pipelines.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {edit.trigger === "stage" && (
                <label className="field">
                  <span>Stage</span>
                  <select
                    value={edit.stageId}
                    onChange={(e) => update({ stageId: e.target.value })}
                  >
                    <option value="">Choose stage</option>
                    {p.pipelineStages
                      .filter((x) => x.pipelineId === edit.pipelineId)
                      .map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name} · {x.category}
                        </option>
                      ))}
                  </select>
                </label>
              )}
              {!["stage", "overdue"].includes(edit.trigger) && (
                <label className="field">
                  <span>Threshold in elapsed days</span>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={edit.days}
                    onChange={(e) => update({ days: Number(e.target.value) })}
                  />
                </label>
              )}
              <label className="field">
                <span>If person priority</span>
                <select
                  value={edit.priority}
                  onChange={(e) =>
                    update({
                      priority: e.target.value as AutomationRule["priority"],
                    })
                  }
                >
                  <option value="">Any priority</option>
                  {priorities.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>If person category</span>
                <select
                  value={edit.category}
                  onChange={(e) => update({ category: e.target.value })}
                >
                  <option value="">Any category</option>
                  {categories.map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Then</span>
                <select
                  value={edit.action}
                  onChange={(e) =>
                    update({
                      action: e.target.value as AutomationRule["action"],
                    })
                  }
                >
                  <option value="task">
                    Create an administrative follow-up
                  </option>
                  <option value="reminder">Record an in-app reminder</option>
                </select>
              </label>
              {edit.action === "task" && (
                <label className="field">
                  <span>Follow-up title</span>
                  <input
                    required
                    maxLength={200}
                    value={edit.taskTitle}
                    onChange={(e) => update({ taskTitle: e.target.value })}
                  />
                </label>
              )}
              {edit.action === "task" && (
                <label className="field">
                  <span>Due after elapsed days</span>
                  <input
                    type="number"
                    min={0}
                    max={90}
                    value={edit.delayDays}
                    onChange={(e) =>
                      update({ delayDays: Number(e.target.value) })
                    }
                  />
                </label>
              )}
            </div>
            <section className="automation-preview">
              <h3>Review before saving</h3>
              <p>
                {edit.trigger === "stage"
                  ? `${p.opportunities.filter((o) => o.pipelineId === edit.pipelineId && o.stageId === edit.stageId).length} currently in this stage; the rule acts only on future entries.`
                  : edit.trigger === "closing"
                    ? `${p.opportunities.filter((o) => o.status === "open" && o.expectedCloseAt && (!edit.pipelineId || o.pipelineId === edit.pipelineId)).length} open opportunities have a close date, before date and safety checks.`
                    : edit.trigger === "inactive"
                      ? `${p.contacts.length} people could be considered before history and safety checks.`
                      : `${p.tasks.filter((t) => !t.completedAt).length} open follow-ups could be considered before date and safety checks.`}
              </p>
              <p>
                When person conditions are selected, all linked people must
                match. Restrictions are checked independently.
              </p>
              <p>
                When {triggers[edit.trigger].toLowerCase()}
                {edit.trigger === "stage"
                  ? ` in ${pipelines.find((x) => x.id === edit.pipelineId)?.name || "a selected pipeline"} / ${p.pipelineStages.find((x) => x.id === edit.stageId)?.name || "a selected stage"}`
                  : ` (${edit.days} elapsed days where applicable)`}
                ,{" "}
                {edit.action === "task"
                  ? `create “${edit.taskTitle}” due ${edit.delayDays} days later`
                  : "record a reminder in Automation history"}
                . Restrictions and withdrawn permissions are always checked
                before any action.
              </p>
              <p>
                Scheduled checks run only while PULSE is open. Rules start
                disabled; older events are not replayed. No email or message is
                sent.
              </p>
              {duplicate && (
                <p role="status">
                  A similar enabled rule already exists. Enabling both may
                  create overlapping reminders or checks.
                </p>
              )}
            </section>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button className="button primary" disabled={busy}>
                {busy ? "Saving…" : "Save disabled draft"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {recordEditor && (
        <EditorModal
          editor={recordEditor}
          onClose={() => setRecordEditor(null)}
        />
      )}
      {deleting && (
        <Modal title="Delete automation?" onClose={() => setDeleting(null)}>
          <p>
            Delete {deleting.name}? Past checks and created follow-ups remain.
          </p>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="button destructive"
              onClick={() =>
                void p
                  .run(
                    () =>
                      deleteAutomationRule(
                        p.db,
                        deleting.id,
                        deleting.updatedAt,
                      ),
                    "Rule deleted",
                  )
                  .then((ok) => {
                    if (ok) setDeleting(null);
                  })
              }
            >
              Delete rule
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
