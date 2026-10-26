import { z } from "zod";
const iso = z.string().datetime();
const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
const zone = z.string().refine((v) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: v });
    return true;
  } catch {
    return false;
  }
});
export const progressPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  achievements: z.boolean().default(true),
  quests: z.boolean().default(true),
  weeklyGoal: z.number().int().min(0).max(100).default(5),
  streak: z.boolean().default(true),
  streakReminders: z.boolean().default(false),
  celebrations: z.boolean().default(true),
});
export const progressStateSchema = z.object({
  id: z.literal("progress"),
  startedAt: iso,
  timezone: zone,
});
export const rewardSchema = z
  .object({
    id: z.string().min(1),
    sourceType: z.enum(["task", "interaction", "opportunity"]),
    sourceId: z.string().min(1),
    rule: z.enum(["follow-up", "conversation", "outcome"]),
    xp: z.union([z.literal(5), z.literal(10)]),
    earnedAt: iso,
    day,
    week: day,
    timezone: zone,
    fingerprint: z.string().regex(/^[a-f0-9]{16}$/),
    active: z.boolean(),
    deleted: z.boolean(),
    updatedAt: iso,
  })
  .superRefine((r, c) => {
    const rules = {
      task: "follow-up",
      interaction: "conversation",
      opportunity: "outcome",
    };
    if (
      r.id !== `${r.sourceType}:${r.sourceId}` ||
      rules[r.sourceType] !== r.rule ||
      r.xp !== (r.sourceType === "interaction" ? 10 : 5) ||
      (r.deleted && r.active)
    )
      c.addIssue({ code: "custom", message: "Invalid reward entitlement." });
  });
export const rewardChangeSchema = z.object({
  id: z.string().min(1),
  rewardId: z.string().min(1),
  sequence: z.number().int().min(1),
  at: iso,
  action: z.enum(["granted", "reversed", "restored"]),
  reason: z.string().min(1).max(300),
});
export const dailyQuestSchema = z
  .object({
    id: z.string().min(1),
    day,
    taskId: z.string().min(1),
    title: z.string().min(1).max(400),
    createdAt: iso,
  })
  .superRefine((q, c) => {
    if (q.id !== `${q.day}:${q.taskId}`)
      c.addIssue({ code: "custom", message: "Invalid quest identifier." });
  });
export type Reward = z.infer<typeof rewardSchema>;
export type RewardChange = z.infer<typeof rewardChangeSchema>;
export type ProgressState = z.infer<typeof progressStateSchema>;
export type DailyQuest = z.infer<typeof dailyQuestSchema>;
