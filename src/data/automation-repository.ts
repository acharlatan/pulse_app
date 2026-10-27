import type { PulseDB } from "./db";
import {
  stamp,
  taskSchema,
  type Opportunity,
  type Task,
  type Contact,
} from "./models";
import {
  automationRuleSchema,
  automationControlSchema,
  automationExecutionSchema,
  type AutomationRule,
  type OpportunityTransition,
} from "./intelligence-models";
import { eligible, lastInteraction } from "../services/recommendations";
import { saveTask } from "./repository";
import { nextTime } from "./expansion-repository";
const DAY = 86400000,
  MAX_RULES = 30,
  MAX_RESULTS = 50,
  CATCH_UP = 30 * DAY;
const sourceLabel = (r: AutomationRule) => `automation:${r.id}`;
async function control(db: PulseDB) {
  return (
    (await db.automationControl.get("automation")) || {
      id: "automation" as const,
      paused: false,
      replayAfter: "1970-01-01T00:00:00.000Z",
    }
  );
}
export async function saveAutomationRule(
  db: PulseDB,
  input: AutomationRule,
  expected?: string,
) {
  return db.transaction("rw", db.tables, async () => {
    const old = await db.automationRules.get(input.id);
    if ((old && old.updatedAt !== expected) || (!old && expected))
      throw new Error("Rule changed in another tab. Reopen it.");
    if (old?.archived) throw new Error("This rule was deleted.");
    if (
      !old &&
      (await db.automationRules.filter((r) => !r.archived).count()) >= MAX_RULES
    )
      throw new Error("Maximum 30 rules. Delete an unused rule first.");
    // Editing always disables a rule, so changes cannot retroactively replay events.
    const next = automationRuleSchema.parse({
      ...input,
      createdAt: old?.createdAt || input.createdAt,
      updatedAt: nextTime(old?.updatedAt),
      enabled: false,
      enabledAt: null,
      archived: false,
    });
    if (
      next.trigger === "closing" &&
      next.pipelineId &&
      !(await db.pipelines.get(next.pipelineId))
    )
      throw new Error("The selected pipeline is unavailable.");
    if (next.trigger === "stage") {
      const stage = await db.pipelineStages.get(next.stageId),
        pipeline = await db.pipelines.get(next.pipelineId);
      if (
        !stage ||
        !pipeline ||
        stage.pipelineId !== pipeline.id ||
        pipeline.archived
      )
        throw new Error("Choose an active pipeline and one of its stages.");
    }
    await db.automationRules.put(next);
    await db.events.add({
      ...stamp(),
      category: "automation",
      contactId: null,
      organizationId: null,
      summary: `Automation draft saved · ${next.name}`,
    });
    return next;
  });
}
export async function setRuleEnabled(
  db: PulseDB,
  id: string,
  enabled: boolean,
  expected: string,
) {
  return db.transaction("rw", db.tables, async () => {
    const r = await db.automationRules.get(id);
    if (!r || r.archived || r.updatedAt !== expected)
      throw new Error("Rule changed in another tab. Reopen it.");
    if (enabled && r.trigger === "stage") {
      const stage = await db.pipelineStages.get(r.stageId),
        pipeline = await db.pipelines.get(r.pipelineId);
      if (
        !stage ||
        !pipeline ||
        pipeline.archived ||
        stage.pipelineId !== pipeline.id
      )
        throw new Error("The selected pipeline or stage is unavailable.");
    }
    const now = nextTime(r.updatedAt),
      next = automationRuleSchema.parse({
        ...r,
        enabled,
        enabledAt: enabled ? new Date().toISOString() : null,
        updatedAt: now,
      });
    await db.automationRules.put(next);
    await db.events.add({
      ...stamp(),
      category: "automation",
      contactId: null,
      organizationId: null,
      summary: `Automation ${enabled ? "enabled" : "paused"} · ${r.name}`,
    });
    return next;
  });
}
export async function deleteAutomationRule(
  db: PulseDB,
  id: string,
  expected: string,
) {
  return db.transaction("rw", db.tables, async () => {
    const r = await db.automationRules.get(id);
    if (!r || r.updatedAt !== expected || r.archived)
      throw new Error("Rule changed in another tab. Reopen it.");
    await db.automationRules.put({
      ...r,
      enabled: false,
      enabledAt: null,
      archived: true,
      updatedAt: nextTime(r.updatedAt),
    });
    await db.events.add({
      ...stamp(),
      category: "automation",
      contactId: null,
      organizationId: null,
      summary: `Automation deleted · ${r.name}`,
    });
  });
}
export async function pauseAutomations(db: PulseDB, paused: boolean) {
  return db.transaction("rw", db.tables, async () => {
    const state = await control(db);
    await db.automationControl.put(
      automationControlSchema.parse({
        ...state,
        paused,
        replayAfter: paused ? state.replayAfter : new Date().toISOString(),
      }),
    );
    await db.events.add({
      ...stamp(),
      category: "automation",
      contactId: null,
      organizationId: null,
      summary: `Automations ${paused ? "paused" : "resumed"}`,
    });
  });
}
type Source =
  | { type: "opportunity"; value: Opportunity }
  | { type: "task"; value: Task }
  | { type: "contact"; value: Contact };
async function execute(
  db: PulseDB,
  rule: AutomationRule,
  occurrenceId: string,
  source: Source,
  now: number,
) {
  // Caller holds the database write transaction across the source re-read, ledger and action.
  const currentRule = await db.automationRules.get(rule.id),
    state = await control(db);
  if (
    !currentRule?.enabled ||
    currentRule.archived ||
    state.paused ||
    currentRule.updatedAt !== rule.updatedAt
  )
    return false;
  const key = JSON.stringify([rule.id, occurrenceId]);
  if (await db.automationExecutions.get(key)) return false;
  const contactIds =
    source.type === "contact"
      ? [source.value.id]
      : source.type === "task"
        ? [source.value.contactId].filter((x): x is string => !!x)
        : source.value.contactIds;
  const contacts = await Promise.all(
    contactIds.map((id) => db.contacts.get(id)),
  );
  const restrictions = await db.restrictions.toArray(),
    permissions = await db.permissions.toArray();
  const blocked = contacts.some(
    (c) =>
      !c ||
      c.availability !== "Available" ||
      !eligible(c, permissions, restrictions, now) ||
      permissions.some(
        (p) =>
          p.contactId === c.id &&
          (p.status === "Denied" || p.status === "Withdrawn"),
      ),
  );
  const filtered =
    !!(rule.priority || rule.category) &&
    (!contacts.length ||
      contacts.some(
        (c) =>
          !c ||
          (rule.priority && c.priority !== rule.priority) ||
          (rule.category && c.category !== rule.category),
      ));
  const primary = contacts[0],
    organizationId = source.value.organizationId;
  // A representative may have changed employers; keep the opportunity's company history intact.
  const taskContact =
    source.type === "opportunity" &&
    organizationId &&
    primary?.organizationId !== organizationId
      ? undefined
      : primary;
  const taskOrganizationId =
    taskContact?.organizationId || organizationId || null;
  let status: "completed" | "blocked" | "skipped" = blocked
      ? "blocked"
      : filtered
        ? "skipped"
        : "completed",
    resultId: string | null = null;
  let explanation = blocked
    ? "A linked person has a restriction or denied/withdrawn permission."
    : filtered
      ? "The selected person conditions do not match."
      : "Local reminder recorded.";
  if (status === "completed" && rule.action === "task") {
    const duplicate = (await db.tasks.toArray()).some(
      (t) =>
        !t.completedAt &&
        t.title === rule.taskTitle &&
        t.contactId === (taskContact?.id || null) &&
        t.organizationId === taskOrganizationId,
    );
    if (duplicate) {
      status = "skipped";
      explanation = "A matching open follow-up already exists.";
    } else {
      const task = taskSchema.parse({
        ...stamp(),
        title: rule.taskTitle,
        description:
          "Administrative review created by a local automation. Check permissions and restrictions before any outreach.",
        source: sourceLabel(rule),
        contactId: taskContact?.id || null,
        organizationId: taskOrganizationId,
        dueAt: new Date(now + rule.delayDays * DAY).toISOString(),
        completedAt: null,
        priority: taskContact?.priority || "Normal",
        reminderMinutes: 0,
      });
      await saveTask(db, task);
      resultId = task.id;
      explanation = "Follow-up created locally; no message was sent.";
    }
  }
  await db.automationExecutions.add(
    automationExecutionSchema.parse({
      id: key,
      ruleId: rule.id,
      occurrenceId,
      sourceType: source.type,
      sourceId: source.value.id,
      sourceDeleted: false,
      resultDeleted: false,
      action: rule.action,
      status,
      resultId,
      at: new Date(now).toISOString(),
      explanation,
    }),
  );
  return true;
}
export async function onOpportunityTransition(
  db: PulseDB,
  t: OpportunityTransition,
  opportunity: Opportunity,
) {
  const rules = await db.automationRules.toArray();
  for (const rule of rules)
    if (
      rule.enabled &&
      !rule.archived &&
      rule.trigger === "stage" &&
      rule.pipelineId === t.pipelineId &&
      rule.stageId === t.stageId &&
      rule.enabledAt &&
      rule.enabledAt <= t.occurredAt
    )
      await execute(
        db,
        rule,
        `transition:${t.id}`,
        { type: "opportunity", value: opportunity },
        Date.parse(t.occurredAt),
      );
}
// One bounded pass, per-source occurrence identities and transactional rechecks serialize multiple tabs.
export async function evaluateScheduledAutomations(
  db: PulseDB,
  now = Date.now(),
) {
  return db.transaction("rw", db.tables, async () => {
    const state = await control(db);
    if (state.paused) return 0;
    const rules = (await db.automationRules.toArray())
      .filter((r) => r.enabled && !r.archived && r.trigger !== "stage")
      .slice(0, MAX_RULES);
    const opportunities = await db.opportunities.toArray(),
      tasks = await db.tasks.toArray(),
      contacts = await db.contacts.toArray(),
      interactions = await db.interactions.toArray();
    // Group once so inactivity rules reuse the shared conversation definition
    // without scanning the entire interaction history for every contact.
    const interactionsByContact = new Map<string, typeof interactions>();
    for (const interaction of interactions) {
      if (!interaction.contactId) continue;
      const group = interactionsByContact.get(interaction.contactId) || [];
      group.push(interaction);
      interactionsByContact.set(interaction.contactId, group);
    }
    const latestByContact = new Map(
      contacts.map((contact) => [
        contact.id,
        lastInteraction(contact.id, interactionsByContact.get(contact.id) || [], now),
      ]),
    );
    let results = 0;
    for (const rule of rules) {
      const since = Math.max(
        Date.parse(rule.enabledAt!),
        Date.parse(state.replayAfter),
        now - CATCH_UP,
      );
      const sources: Source[] =
        rule.trigger === "closing"
          ? opportunities
              .filter((o) => o.status === "open" && !!o.expectedCloseAt)
              .map((value) => ({ type: "opportunity", value }))
          : rule.trigger === "inactive"
            ? contacts.map((value) => ({ type: "contact", value }))
            : tasks
                .filter(
                  (t) => !t.completedAt && !t.source?.startsWith("automation:"),
                )
                .map((value) => ({ type: "task", value }));
      for (const source of sources) {
        if (results >= MAX_RESULTS) return results;
        const date =
          source.type === "opportunity"
            ? source.value.expectedCloseAt!
            : source.type === "task"
              ? source.value.dueAt
              : latestByContact.get(source.value.id);
        if (!date) continue;
        if (
          (rule.trigger === "due" || rule.trigger === "closing") &&
          Date.parse(date) < now
        )
          continue;
        const threshold =
          Date.parse(date) +
          (rule.trigger === "inactive"
            ? rule.days * DAY
            : rule.trigger === "overdue"
              ? 0
              : -rule.days * DAY);
        if (threshold > now || threshold < since) continue;
        if (
          source.type === "opportunity" &&
          rule.pipelineId &&
          source.value.pipelineId !== rule.pipelineId
        )
          continue;
        const occurrence = JSON.stringify([
          rule.trigger,
          source.value.id,
          date,
          rule.days,
        ]);
        if (await execute(db, rule, occurrence, source, now)) results++;
      }
    }
    return results;
  });
}
