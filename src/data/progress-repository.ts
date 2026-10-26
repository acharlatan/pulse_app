import type { PulseDB } from "./db";
import { defaults, settingsSchema, stamp } from "./models";
import { rewardSchema, type Reward } from "./progress-models";
import { calendarDay, weekOf, sourceRule } from "../services/progress";
export async function ensureProgress(db: PulseDB) {
  await db.transaction("rw", [db.progressState, db.settings], async () => {
    if (await db.progressState.get("progress")) return;
    const s = settingsSchema.parse(
      (await db.settings.get("settings")) || defaults,
    );
    if (s.progress.enabled)
      await db.progressState.add({
        id: "progress",
        startedAt: new Date().toISOString(),
        timezone: s.timezone,
      });
  });
}
// Called only from the surrounding CRM transaction. No separate mutation or replay listener.
export async function syncReward(
  db: PulseDB,
  type: Reward["sourceType"],
  id: string,
  allowGrant = false,
  deleted = false,
) {
  const s = settingsSchema.parse(
    (await db.settings.get("settings")) || defaults,
  );
  let state = await db.progressState.get("progress");
  const now = new Date().toISOString(),
    key = `${type}:${id}`,
    old = await db.rewards.get(key);
  if (!state && s.progress.enabled) {
    state = { id: "progress", startedAt: now, timezone: s.timezone };
    await db.progressState.add(state);
  }
  if (!state) return;
  const source =
    type === "task"
      ? await db.tasks.get(id)
      : type === "interaction"
        ? await db.interactions.get(id)
        : await db.opportunities.get(id);
  const rule =
    source && !deleted
      ? sourceRule(
          type,
          source,
          {
            contacts: await db.contacts.toArray(),
            permissions: await db.permissions.toArray(),
            restrictions: await db.restrictions.toArray(),
          },
          Date.parse(old?.earnedAt || now),
        )
      : null;
  if (old) {
    const active = !!rule && !old.deleted && !deleted;
    if (old.active !== active || (deleted && !old.deleted)) {
      await db.rewards.update(key, {
        active,
        deleted: old.deleted || deleted,
        updatedAt: now,
      });
      if (old.active !== active)
        await db.rewardChanges.add({
          id: stamp().id,
          rewardId: key,
          sequence:
            (await db.rewardChanges.where("rewardId").equals(key).count()) + 1,
          at: now,
          action: active ? "restored" : "reversed",
          reason: deleted
            ? "Source deleted"
            : active
              ? "Original entitlement restored; earning date unchanged"
              : "Source reopened or no longer qualifies",
        });
    }
    return;
  }
  if (!allowGrant || !s.progress.enabled || !rule || !source) return;
  // Never backfill old conversations. Existing open tasks/deals can qualify on a new completion/outcome.
  if (
    type === "interaction" &&
    Date.parse(source.createdAt) < Date.parse(state.startedAt)
  )
    return;
  const day = calendarDay(now, state.timezone);
  const all = await db.rewards.where("day").equals(day).toArray();
  const equivalent = await db.rewards
    .where("fingerprint")
    .equals(rule.fingerprint)
    .toArray();
  if (all.length >= 10 || equivalent.some((r) => r.deleted || r.day === day))
    return;
  const reward = rewardSchema.parse({
    id: key,
    sourceType: type,
    sourceId: id,
    ...rule,
    earnedAt: now,
    day,
    week: weekOf(day),
    timezone: state.timezone,
    active: true,
    deleted: false,
    updatedAt: now,
  });
  await db.rewards.add(reward);
  await db.rewardChanges.add({
    id: stamp().id,
    rewardId: key,
    sequence: 1,
    at: now,
    action: "granted",
    reason: `${rule.xp} XP · ${rule.rule}`,
  });
  return { earnedXP: rule.xp };
}
export async function ensureDailyQuests(db: PulseDB) {
  await db.transaction(
    "rw",
    [
      db.dailyQuests,
      db.progressState,
      db.settings,
      db.tasks,
      db.contacts,
      db.permissions,
      db.restrictions,
      db.rewards,
    ],
    async () => {
      const s = settingsSchema.parse(
          (await db.settings.get("settings")) || defaults,
        ),
        state = await db.progressState.get("progress");
      if (!state || !s.progress.enabled || !s.progress.quests) return;
      const now = Date.now(),
        day = calendarDay(now, state.timezone),
        existing = await db.dailyQuests.where("day").equals(day).toArray();
      if (existing.length >= 3) return;
      const contacts = await db.contacts.toArray(),
        ps = await db.permissions.toArray(),
        rs = await db.restrictions.toArray();
      const priorRewards = await db.rewards.toArray();
      const allTasks = await db.tasks.toArray();
      const evidence = { contacts, permissions: ps, restrictions: rs };
      const signature = (t: (typeof allTasks)[number]) =>
        sourceRule(
          "task",
          { ...t, completedAt: new Date(now).toISOString() },
          evidence,
          now,
        )?.fingerprint;
      const seen = new Set(
        existing
          .map((q) => allTasks.find((t) => t.id === q.taskId))
          .filter((t) => !!t)
          .map((t) => signature(t!)),
      );
      const candidates = allTasks
        .filter(
          (t) =>
            !t.completedAt &&
            calendarDay(t.dueAt, state.timezone) <= day &&
            !existing.some((q) => q.taskId === t.id),
        )
        .sort(
          (a, b) => a.dueAt.localeCompare(b.dueAt) || a.id.localeCompare(b.id),
        );
      const tasks: typeof allTasks = [];
      for (const t of candidates) {
        const key = signature(t),
          own = priorRewards.find(
            (r) => r.sourceType === "task" && r.sourceId === t.id,
          );
        if (
          !key ||
          seen.has(key) ||
          own?.deleted ||
          (own && own.day !== day) ||
          priorRewards.some(
            (r) =>
              r.sourceId !== t.id &&
              r.fingerprint === key &&
              (r.deleted || r.day === day),
          ) ||
          (!own && priorRewards.filter((r) => r.day === day).length >= 10)
        )
          continue;
        tasks.push(t);
        seen.add(key);
      }
      for (const t of tasks.slice(0, 3 - existing.length))
        await db.dailyQuests.add({
          id: `${day}:${t.id}`,
          day,
          taskId: t.id,
          title: `Complete: ${t.title}`,
          createdAt: new Date(now).toISOString(),
        });
    },
  );
}
