import type { PulseDB } from "./db";
import { stamp, type Opportunity } from "./models";
import {
  pipelineSchema,
  pipelineStageSchema,
  validatePipelineGraph,
  type PipelineDefinition,
  type PipelineStage,
} from "../services/pipelines";
import {
  fieldDefinitionSchema,
  fieldValueSchema,
  focusSchema,
  validateFieldValue,
  type FieldDefinition,
  type FieldValue,
  type FocusItem,
} from "./expansion-models";
import { syncReward } from "./progress-repository";
const tableFor = (type: FocusItem["entityType"]) =>
  ({
    contact: "contacts",
    organization: "organizations",
    opportunity: "opportunities",
    task: "tasks",
  })[type];
export const nextTime = (previous?: string) =>
  new Date(
    Math.max(Date.now(), Date.parse(previous || "") + 1 || 0),
  ).toISOString();
export async function savePipeline(
  db: PulseDB,
  input: PipelineDefinition,
  inputStages: PipelineStage[],
  expected?: string,
  mapping: Record<string, string> = {},
  confirmed = false,
) {
  return db.transaction("rw", db.tables, async () => {
    const previous = await db.pipelines.get(input.id);
    if (
      (previous && previous.updatedAt !== expected) ||
      (!previous && expected)
    )
      throw new Error("Pipeline changed in another tab. Reopen the editor.");
    const pipeline = pipelineSchema.parse({
      ...input,
      createdAt: previous?.createdAt || input.createdAt,
      updatedAt: nextTime(previous?.updatedAt),
    });
    const oldStages = await db.pipelineStages
      .where("pipelineId")
      .equals(pipeline.id)
      .toArray();
    const stageRows = inputStages.map((s) =>
      pipelineStageSchema.parse({
        ...s,
        pipelineId: pipeline.id,
        createdAt:
          oldStages.find((x) => x.id === s.id)?.createdAt || s.createdAt,
        updatedAt: pipeline.updatedAt,
      }),
    );
    const others = (await db.pipelines.toArray())
      .filter((p) => p.id !== pipeline.id)
      .map((p) =>
        pipeline.isDefault && p.isDefault
          ? { ...p, isDefault: false, updatedAt: nextTime(p.updatedAt) }
          : p,
      );
    const otherStages = (await db.pipelineStages.toArray()).filter(
      (s) => s.pipelineId !== pipeline.id,
    );
    if (stageRows.some((s) => otherStages.some((o) => o.id === s.id)))
      throw new Error("Stage identity is already in use.");
    let affected = 0;
    const opportunities = (await db.opportunities.toArray()).map((o) => {
      if (o.pipelineId !== pipeline.id) return o;
      const dest = stageRows.find(
        (s) => s.id === (mapping[o.stageId] || o.stageId),
      );
      if (!dest)
        throw new Error("Map every used deleted stage to a replacement.");
      if (o.stageId !== dest.id || o.status !== dest.category) {
        affected++;
        return {
          ...o,
          stageId: dest.id,
          status: dest.category,
          updatedAt: nextTime(o.updatedAt),
        };
      }
      return o;
    });
    if (affected && !confirmed)
      throw new Error(
        `${affected} opportunities will be remapped. Review and confirm the impact.`,
      );
    validatePipelineGraph({
      pipelines: [...others, pipeline],
      stages: [...otherStages, ...stageRows],
      opportunities,
    });
    await db.pipelines.bulkPut([...others, pipeline]);
    await db.pipelineStages.bulkDelete(oldStages.map((s) => s.id));
    await db.pipelineStages.bulkPut(stageRows);
    for (const o of opportunities) {
      const old = await db.opportunities.get(o.id);
      if (old?.updatedAt !== o.updatedAt) {
        await db.opportunities.put(o as Opportunity);
        await syncReward(db, "opportunity", o.id, false); // corrections only, never new grants
      }
    }
    await db.events.add({
      ...stamp(),
      category: "configuration",
      contactId: null,
      organizationId: null,
      summary: `Pipeline updated · ${pipeline.name} · ${affected} opportunities remapped`,
    });
    return pipeline;
  });
}
export async function deletePipeline(
  db: PulseDB,
  id: string,
  expected: string,
) {
  await db.transaction("rw", db.tables, async () => {
    const p = await db.pipelines.get(id);
    if (!p || p.updatedAt !== expected)
      throw new Error("Pipeline changed. Reopen it.");
    if (
      p.isDefault ||
      (await db.opportunities.where("pipelineId").equals(id).count())
    )
      throw new Error(
        "Choose another default and move opportunities first, or archive this pipeline.",
      );
    await db.pipelineStages.where("pipelineId").equals(id).delete();
    await db.pipelines.delete(id);
    await db.events.add({
      ...stamp(),
      category: "configuration",
      contactId: null,
      organizationId: null,
      summary: `Pipeline deleted · ${p.name}`,
    });
  });
}
export async function saveField(
  db: PulseDB,
  input: FieldDefinition,
  expected?: string,
) {
  await db.transaction("rw", db.tables, async () => {
    const old = await db.fieldDefinitions.get(input.id);
    if ((old && old.updatedAt !== expected) || (!old && expected))
      throw new Error("Field changed. Reopen its editor.");
    const parsed = fieldDefinitionSchema.parse({
      ...input,
      updatedAt: nextTime(old?.updatedAt),
    });
    if (
      old &&
      (old.type !== parsed.type || old.entityType !== parsed.entityType)
    )
      throw new Error("Create a new field to change its type or record type.");
    if (
      new Set(parsed.choices).size !== parsed.choices.length ||
      (parsed.type === "select" && !parsed.choices.length)
    )
      throw new Error("Select fields need unique choices.");
    if (
      !old &&
      (await db.fieldDefinitions
        .where("entityType")
        .equals(parsed.entityType)
        .count()) >= 30
    )
      throw new Error("Up to 30 fields per record type.");
    for (const v of await db.fieldValues
      .where("fieldId")
      .equals(parsed.id)
      .toArray())
      validateFieldValue(parsed, v.value);
    await db.fieldDefinitions.put(parsed);
    await db.events.add({
      ...stamp(),
      category: "configuration",
      contactId: null,
      organizationId: null,
      summary: `Custom field saved · ${parsed.label}`,
    });
  });
}
export async function deleteField(
  db: PulseDB,
  id: string,
  expected: string,
  count: number,
) {
  await db.transaction("rw", db.tables, async () => {
    const old = await db.fieldDefinitions.get(id);
    if (
      !old ||
      old.updatedAt !== expected ||
      (await db.fieldValues.where("fieldId").equals(id).count()) !== count
    )
      throw new Error("Field or values changed. Review deletion again.");
    await db.fieldValues.where("fieldId").equals(id).delete();
    await db.fieldDefinitions.delete(id);
    await db.events.add({
      ...stamp(),
      category: "configuration",
      contactId: null,
      organizationId: null,
      summary: `Custom field deleted · ${old.label} · ${count} values removed`,
    });
  });
}
export async function saveFieldValues(
  db: PulseDB,
  type: FieldDefinition["entityType"],
  recordId: string,
  values: { fieldId: string; value: FieldValue["value"] | null }[],
  snapshot: string,
) {
  await db.transaction("rw", db.tables, async () => {
    if (!(await db.table(tableFor(type)).get(recordId)))
      throw new Error("Record no longer exists.");
    const old = await db.fieldValues
      .where("recordId")
      .equals(recordId)
      .toArray();
    if (JSON.stringify(old) !== snapshot)
      throw new Error("Custom values changed. Reopen the editor.");
    for (const v of values) {
      const field = await db.fieldDefinitions.get(v.fieldId);
      if (!field || field.entityType !== type || field.archived)
        throw new Error("Field changed or was archived. Reopen the editor.");
      const id = JSON.stringify([v.fieldId, recordId]);
      if (v.value === null) {
        await db.fieldValues.delete(id);
        continue;
      }
      validateFieldValue(field, v.value);
      const previous = old.find((x) => x.id === id);
      await db.fieldValues.put(
        fieldValueSchema.parse({
          ...stamp(),
          ...previous,
          id,
          recordId,
          fieldId: v.fieldId,
          value: v.value,
          updatedAt: nextTime(previous?.updatedAt),
        }),
      );
    }
    await db.events.add({
      ...stamp(),
      category: "configuration",
      contactId: type === "contact" ? recordId : null,
      organizationId: type === "organization" ? recordId : null,
      summary: "Custom relationship details updated",
    });
  });
}
export async function setFocus(
  db: PulseDB,
  type: FocusItem["entityType"],
  recordId: string,
  mode: "pin" | "unpin" | "today" | "removeToday",
  day?: string,
) {
  await db.transaction("rw", db.tables, async () => {
    const id = JSON.stringify([type, recordId]);
    if (mode === "unpin") {
      await db.focusItems.delete(id);
      return;
    }
    if (!(await db.table(tableFor(type)).get(recordId)))
      throw new Error("Record no longer exists.");
    const old = await db.focusItems.get(id);
    if (!old && (await db.focusItems.count()) >= 100)
      throw new Error("Keep up to 100 pinned items.");
    if (
      mode === "today" &&
      (await db.focusItems.toArray()).filter(
        (x) => x.today === day && x.id !== id,
      ).length >= 20
    )
      throw new Error("Keep up to 20 priorities for a day.");
    await db.focusItems.put(
      focusSchema.parse({
        ...stamp(),
        ...old,
        id,
        entityType: type,
        recordId,
        today:
          mode === "today"
            ? day
            : mode === "removeToday"
              ? null
              : old?.today || null,
        updatedAt: nextTime(old?.updatedAt),
      }),
    );
  });
}
export async function bulkTag(
  db: PulseDB,
  type: "contact" | "organization",
  selected: { id: string; updatedAt: string }[],
  tag: string,
  operation: "addTag" | "removeTag" | "priority" | "pin" | "unpin" = "addTag",
) {
  if (
    !selected.length ||
    selected.length > 200 ||
    new Set(selected.map((x) => x.id)).size !== selected.length ||
    !tag.trim() ||
    tag.length > 100
  )
    throw new Error("Select 1–200 records and a tag up to 100 characters.");
  return db.transaction("rw", db.tables, async () => {
    if (
      operation === "priority" &&
      (type !== "contact" || !["Low", "Normal", "High", "VIP"].includes(tag))
    )
      throw new Error("Choose a valid contact priority.");
    const table = db.table(tableFor(type));
    for (const s of selected) {
      const r = await table.get(s.id);
      if (!r || r.updatedAt !== s.updatedAt)
        throw new Error(
          "Selection changed. Refresh and review the selected records.",
        );
      if (operation === "pin" || operation === "unpin")
        await setFocus(db, type, r.id, operation);
      else
        await table.put({
          ...r,
          ...(operation === "priority"
            ? { priority: tag }
            : {
                tags:
                  operation === "removeTag"
                    ? r.tags.filter((t: string) => t !== tag.trim())
                    : [...new Set([...r.tags, tag.trim()])],
              }),
          updatedAt: nextTime(r.updatedAt),
        });
    }
    await db.events.add({
      ...stamp(),
      category: "bulk",
      contactId: null,
      organizationId: null,
      summary: `Bulk ${operation} · ${tag.trim()} · ${selected.length} records`,
    });
    return selected.length;
  });
}
