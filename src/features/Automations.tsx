import { useInterfaceText } from "../i18n/useInterfaceText";
import { ArrowRight, Workflow, CalendarClock, Users, Bell } from "lucide-react";
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
import { ContextTip } from "../components/context-tip";
const triggers: Record<AutomationRule["trigger"], string> = {
  stage: "Opportunity enters a stage",
  closing: "Opportunity closing soon",
  due: "Follow-up due soon",
  overdue: "Follow-up becomes overdue",
  inactive: "Person reaches an inactivity threshold",
};
export function Automations() {
  const __pulseText = useInterfaceText();
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
  const scenarios = {
    stage: ["When an opportunity moves", "Prepare a follow-up when an opportunity enters a stage you choose."],
    closing: ["When a close date is near", "Prepare a follow-up for an open opportunity approaching its saved close date."],
    inactive: ["When it is time to review", "Record a reminder when a person reaches your chosen inactivity threshold."],
    overdue: ["When a follow-up is overdue", "Record an in-app reminder so a saved commitment stays visible."],
  } as const;
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
      <div className="page-heading editorial-masthead insight-masthead">
        <div>
          <p className="eyebrow">{__pulseText("LESS ADMIN, MORE TIME FOR PEOPLE")}</p>
          <h1>
            {__pulseText("Automations")}<span className="accent">.</span>
          </h1>
          <p className="editorial-deck">
            {__pulseText("Choose what to watch for, then decide what PULSE should prepare. You stay in control.")}</p>
        </div>
        <Link className="button secondary" to="/analytics">
          {__pulseText("Open Analytics")}</Link>
      </div>
      <ContextTip title="Build a helpful routine">Choose a recipe and review the trigger and action. Rules start disabled; enable one only when it is ready. Checks run while Pulse is open.</ContextTip>
      <section className="automation-studio-intro"><div><p className="eyebrow">{__pulseText("YOUR WORKFLOW, MADE LIGHTER")}</p><h2>{__pulseText("Give good intentions a little structure.")}</h2><p>{__pulseText("Start with a recipe, make it yours, and enable it when you’re ready. PULSE checks while the app is open; it never sends messages automatically.")}</p></div><div className="automation-studio-steps"><span><b>01</b>{__pulseText("Choose a moment")}</span><ArrowRight size={17}/><span><b>02</b>{__pulseText("Choose an action")}</span><ArrowRight size={17}/><span><b>03</b>{__pulseText("Review & enable")}</span></div></section>
      <section className="surface automation-recipe-section">
        <div className="automation-recipe-heading"><div><p className="eyebrow">{__pulseText("START SOMETHING USEFUL")}</p><h2>{__pulseText("Choose a recipe.")}</h2></div><span>{visible.filter((r) => r.enabled).length} {__pulseText("enabled rules")}</span></div>
        <p className="muted">
          {__pulseText("Every recipe opens as a disabled draft for you to review.")}</p>
        <div className="automation-templates">
          {(["stage", "closing", "inactive", "overdue"] as const).map((k) => (
            <button
              key={k}
              className="automation-template"
              onClick={() => {
                setError("");
                setEdit(draft(k));
              }}
            >
              {(() => {
                const Icon = {
                  stage: Workflow,
                  closing: CalendarClock,
                  inactive: Users,
                  overdue: Bell,
                }[k];
                return <Icon size={26} />;
              })()}
              <h3>{__pulseText(scenarios[k][0])}</h3>
              <span className="template-scenario">{__pulseText(scenarios[k][1])}</span>
              <span className="template-trigger">{__pulseText(triggers[k])}</span>
              <ArrowRight className="template-arrow" size={20} />
              <span className="template-action">
                {k === "stage" || k === "closing"
                  ? __pulseText("Create a local follow-up")
                  : __pulseText("Record a local reminder")}
              </span>
              <small>{__pulseText("Set up rule →")}</small>
            </button>
          ))}
        </div>
      </section>
      <p className="automation-local-note">
        {__pulseText("Local checks while PULSE is open. Nothing is sent automatically; templates are saved disabled.")}</p>
      <details className="automation-operation">
        <summary>{__pulseText("Execution & safety")}</summary>
        <h2>{__pulseText("Runs when PULSE is open")}</h2>
        <p>
          {__pulseText("Local checks run on opening, when you return to the app, and periodically while it is active. Closed-app delivery is not guaranteed. No rule sends messages or changes permissions.")}</p>
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
            {state?.paused ? __pulseText("Resume all automations") : __pulseText("Pause all automations")}
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
            {__pulseText("Check eligible conditions now")}</button>
        </div>
        <p className="muted">
          {__pulseText("Up to 30 rules; checks are bounded to keep your workspace responsive.")}</p>
        <p className="muted">
          {state?.paused
            ? __pulseText("All rules are paused.")
            : __pulseText("Rules run only after you enable them. The latest 30 days of eligible missed checks may be considered; conditions before enabling, resuming or restoring never replay.")}
        </p>
      </details>
      <section className="surface">
        <div className="automation-recipe-heading"><div><p className="eyebrow">{__pulseText("YOUR AUTOMATIONS")}</p><h2>{__pulseText("Your rules")}</h2></div><span>{visible.length} {__pulseText("saved")}</span></div>
        {!visible.length && (
          <div className="automation-empty"><strong>{__pulseText("Your first recipe is waiting.")}</strong><p>{__pulseText("Choose a recipe above to create a draft. Nothing runs until you enable it.")}</p></div>
        )}
        {visible.map((r) => (
          <article className="automation-rule" key={r.id}>
            <div>
              <h3>{r.name}</h3>
              <span className="rule-state">
                {r.enabled ? __pulseText("Enabled") : __pulseText("Disabled draft")}
              </span>
              <div className="rule-sequence">
                <span>
                  <small>{__pulseText("WHEN")}</small>
                  {triggers[r.trigger]}
                  <br />
                  {r.trigger === "stage"
                    ? `${p.pipelines.find((x) => x.id === r.pipelineId)?.name || "Pipeline"} / ${p.pipelineStages.find((x) => x.id === r.stageId)?.name || "Stage"}`
                    : r.trigger === "overdue"
                      ? __pulseText("Saved due time has passed")
                      : `${r.days} elapsed days`}
                </span>
                <ArrowRight size={17} />
                <span>
                  <small>{__pulseText("IF")}</small>
                  {[r.priority, r.category].filter(Boolean).join(" · ") ||
                    __pulseText("Any matching record")}
                </span>
                <ArrowRight size={17} />
                <span>
                  <small>{__pulseText("THEN")}</small>
                  {r.action === "task" ? __pulseText("Create follow-up") : __pulseText("Record reminder")}
                </span>
              </div>
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
                {__pulseText("Edit")}</button>
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
                {r.enabled ? __pulseText("Disable") : __pulseText("Enable")}
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
                {__pulseText("Duplicate")}</button>
              <button
                className="button ghost destructive"
                onClick={() => setDeleting(r)}
              >
                {__pulseText("Delete")}</button>
            </div>
          </article>
        ))}
      </section>
      <section className="surface">
        <h2>{__pulseText("Automation history")}</h2>
        <p className="muted">
          {__pulseText("Latest 80 checks; duplicate-prevention records remain stored even when older items are not shown. Reminders are visible here while the app is open.")}</p>
        {!history.length && <p>{__pulseText("No checks recorded yet.")}</p>}
        {history.map((h) => (
          <article key={h.id} className="automation-history">
            <strong>
              {rules.find((r) => r.id === h.ruleId)?.name || __pulseText("Deleted rule")} ·{" "}
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
                {__pulseText("Open created follow-up")}</button>
            )}
            {h.resultId && h.resultDeleted && <span>{__pulseText("Follow-up removed")}</span>}{" "}
            {h.sourceType === "contact" && (
              <Link to={`/network/people/${h.sourceId}`}>{__pulseText("Open person")}</Link>
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
                  {__pulseText("Open opportunity")}</button>
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
                  {__pulseText("Open source follow-up")}</button>
              )}
          </article>
        ))}
      </section>
      {edit && (
        <Modal
          title={
            rules.some((r) => r.id === edit.id)
              ? __pulseText("Edit automation draft")
              : __pulseText("Create automation draft")
          }
          onClose={() => setEdit(null)}
        >
          <form onSubmit={(e) => void save(e)}>
            <p>
              {__pulseText("Rules are saved disabled. Editing an enabled rule disables it until you review and enable it again.")}</p>
            <div className="automation-form-steps"><span><b>01</b> {__pulseText("When")}</span><ArrowRight size={15}/><span><b>02</b> {__pulseText("Then")}</span><ArrowRight size={15}/><span><b>03</b> {__pulseText("Review")}</span></div>
            <div className="form-grid">
              <label className="field wide">
                <span>{__pulseText("Rule name")}</span>
                <input
                  required
                  maxLength={100}
                  value={edit.name}
                  onChange={(e) => update({ name: e.target.value })}
                />
              </label>
              <label className="field wide">
                <span>{__pulseText("Description (optional)")}</span>
                <input
                  maxLength={500}
                  value={edit.description}
                  onChange={(e) => update({ description: e.target.value })}
                />
              </label>
              <label className="field">
                <span>{__pulseText("When")}</span>
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
                      {__pulseText(label)}
                    </option>
                  ))}
                </select>
              </label>
              {(edit.trigger === "stage" || edit.trigger === "closing") && (
                <label className="field">
                  <span>{__pulseText("Pipeline")}</span>
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
                        ? __pulseText("Choose pipeline")
                        : __pulseText("Any pipeline")}
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
                  <span>{__pulseText("Stage")}</span>
                  <select
                    value={edit.stageId}
                    onChange={(e) => update({ stageId: e.target.value })}
                  >
                    <option value="">{__pulseText("Choose stage")}</option>
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
                  <span>{__pulseText("Threshold in elapsed days")}</span>
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
                <span>{__pulseText("If person priority")}</span>
                <select
                  value={edit.priority}
                  onChange={(e) =>
                    update({
                      priority: e.target.value as AutomationRule["priority"],
                    })
                  }
                >
                  <option value="">{__pulseText("Any priority")}</option>
                  {priorities.map((x) => (
                    <option key={x} value={x}>{__pulseText(x)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("If person category")}</span>
                <select
                  value={edit.category}
                  onChange={(e) => update({ category: e.target.value })}
                >
                  <option value="">{__pulseText("Any category")}</option>
                  {categories.map((x) => (
                    <option key={x} value={x}>{__pulseText(x)}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{__pulseText("Then")}</span>
                <select
                  value={edit.action}
                  onChange={(e) =>
                    update({
                      action: e.target.value as AutomationRule["action"],
                    })
                  }
                >
                  <option value="task">
                    {__pulseText("Create an administrative follow-up")}</option>
                  <option value="reminder">{__pulseText("Record an in-app reminder")}</option>
                </select>
              </label>
              {edit.action === "task" && (
                <label className="field">
                  <span>{__pulseText("Follow-up title")}</span>
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
                  <span>{__pulseText("Due after elapsed days")}</span>
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
              <h3>{__pulseText("Review before saving")}</h3>
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
                {__pulseText("When person conditions are selected, all linked people must match. Restrictions are checked independently.")}</p>
              <p>
                {__pulseText("When") + " "}{triggers[edit.trigger].toLowerCase()}
                {edit.trigger === "stage"
                  ? ` in ${pipelines.find((x) => x.id === edit.pipelineId)?.name || "a selected pipeline"} / ${p.pipelineStages.find((x) => x.id === edit.stageId)?.name || "a selected stage"}`
                  : ` (${edit.days} elapsed days where applicable)`}
                ,{" "}
                {edit.action === "task"
                  ? `create “${edit.taskTitle}” due ${edit.delayDays} days later`
                  : __pulseText("record a reminder in Automation history")}
                {__pulseText(". Restrictions and withdrawn permissions are always checked before any action.")}</p>
              <p>
                {__pulseText("Scheduled checks run only while PULSE is open. Rules start disabled; older events are not replayed. No email or message is sent.")}</p>
              {duplicate && (
                <p role="status">
                  {__pulseText("A similar enabled rule already exists. Enabling both may create overlapping reminders or checks.")}</p>
              )}
            </section>
            {error && (
              <p className="form-error" role="alert">
                {__pulseText(error)}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEdit(null)}
              >
                {__pulseText("Cancel")}</button>
              <button className="button primary" disabled={busy}>
                {busy ? __pulseText("Saving…") : __pulseText("Save disabled draft")}
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
        <Modal title={__pulseText("Delete automation?")} onClose={() => setDeleting(null)}>
          <p>
            {__pulseText("Delete") + " "}{deleting.name}{__pulseText("? Past checks and created follow-ups remain.")}</p>
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              {__pulseText("Cancel")}</button>
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
              {__pulseText("Delete rule")}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
