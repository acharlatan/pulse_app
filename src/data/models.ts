import { aiPreferencesSchema } from "../ai/contracts";
import { z } from "zod";
import { progressPreferencesSchema } from "./progress-models";
export const stages = [
  "New",
  "Researching",
  "Contacted",
  "Engaged",
  "Discovery",
  "Proposal",
  "Negotiation",
  "Won",
  "Lost",
] as const;
export const priorities = ["Low", "Normal", "High", "VIP"] as const;
export const availabilities = [
  "Available",
  "Temporarily unavailable",
  "On hold",
  "Do not contact",
] as const;
export const categories = [
  "Prospect",
  "Lead",
  "Active client",
  "Former client",
  "Partner",
  "Vendor",
  "Other",
] as const;
const base = {
  id: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const organizationSchema = z.object({
  ...base,
  name: z.string().trim().min(1).max(200),
  industry: z.string(),
  website: z.string(),
  description: z.string(),
  avatar: z.string(),
  coverMediaId: z.string().max(200).optional(),
  location: z.string(),
  tags: z.array(z.string()),
  customFields: z.record(z.string(), z.string()),
});
export const contactSchema = z.object({
  ...base,
  name: z.string().trim().min(1).max(200),
  preferredName: z.string(),
  role: z.string(),
  organizationId: z.string().nullable(),
  emails: z.array(z.string().email()),
  phones: z.array(z.string()),
  links: z.array(z.string().url()),
  avatar: z.string(),
  coverMediaId: z.string().max(200).optional(),
  category: z.enum(categories),
  stage: z.enum(stages),
  availability: z.enum(availabilities),
  timeoutUntil: z.string().datetime().nullable(),
  priority: z.enum(priorities),
  tags: z.array(z.string()),
  nextFollowUp: z.string().datetime().nullable(),
  importProvenance: z
    .object({
      batchId: z.string(),
      fileName: z.string(),
      importedAt: z.string().datetime(),
      lastContactAt: z.string().datetime().nullable(),
    })
    .optional(),
});
export const interactionSchema = z.object({
  ...base,
  contactId: z.string().nullable(),
  organizationId: z.string().nullable(),
  type: z.enum(["Call", "Email", "Meeting", "Message", "Note"]),
  occurredAt: z.string().datetime(),
  summary: z.string().trim().min(1).max(20000),
  outcome: z.string(),
  opportunityId: z.string().nullable(),
  followUpId: z.string().nullable(),
  source: z.string().optional(),
});
export const taskSchema = z.object({
  ...base,
  title: z.string().trim().min(1).max(300),
  source: z.string().max(200).optional(),
  description: z.string(),
  contactId: z.string().nullable(),
  organizationId: z.string().nullable(),
  dueAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  priority: z.enum(priorities),
  reminderMinutes: z.number().nonnegative(),
});
export const opportunitySchema = z.object({
  ...base,
  title: z.string().min(1),
  organizationId: z.string().nullable(),
  contactIds: z.array(z.string()),
  pipelineId: z.string(),
  stageId: z.string().min(1).max(300),
  value: z.number().nonnegative().nullable(),
  currency: z.string(),
  status: z.enum(["open", "won", "lost"]),
  probability: z.number().min(0).max(100).nullable(),
  expectedCloseAt: z.string().datetime().nullable(),
  notes: z.string(),
});
export const restrictionSchema = z.object({
  ...base,
  contactId: z.string(),
  type: z.enum(availabilities),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
  reason: z.string(),
  source: z.string(),
});
export const permissionSchema = z.object({
  ...base,
  contactId: z.string(),
  channel: z.enum(["Email", "Phone", "Message", "All"]),
  purpose: z.enum(["Relationship", "Marketing"]),
  status: z.enum(["Granted", "Unknown", "Denied", "Withdrawn"]),
  evidence: z.string(),
  withdrawnAt: z.string().datetime().nullable(),
});
export const eventSchema = z.object({
  ...base,
  category: z.string(),
  entityType: z.enum(["task", "interaction", "opportunity"]).optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  workspace: z.enum(["demo", "personal"]).optional(),
  occurrenceId: z.string().optional(),
  contactId: z.string().nullable(),
  organizationId: z.string().nullable(),
  summary: z.string(),
});
export const intelligenceSchema = z.object({
  coolingDays: z.number().int().min(1).max(3650).default(30),
  dormantDays: z.number().int().min(1).max(3650).default(90),
  stalledDays: z.number().int().min(1).max(3650).default(21),
  closingDays: z.number().int().min(1).max(365).default(7),
  enabled: z.boolean().default(true),
  opportunities: z.boolean().default(true),
  noHistory: z.boolean().default(true),
  timeoutReviews: z.boolean().default(true),
  snoozeDays: z.number().int().min(1).max(365).default(7),
  homeLimit: z.number().int().min(1).max(10).default(3),
});
export const filterFields = [
  "category",
  "stage",
  "priority",
  "availability",
  "organizationId",
  "tag",
  "daysSince",
  "health",
  "taskState",
  "opportunityStatus",
  "opportunityStage",
  "pipelineId",
  "customField",
  "pinned",
  "industry",
  "representativePriority",
  "noRepresentatives",
  "closingSoon",
] as const;
export const healthStates = [
  "Active",
  "Needs attention",
  "Cooling",
  "Dormant",
  "Paused",
  "Restricted",
  "Not enough history",
] as const;
export const conditionSchema = z
  .object({
    field: z.enum(filterFields),
    operator: z.enum([
      "is",
      "isNot",
      "contains",
      "atLeast",
      "atMost",
      "before",
      "after",
    ]),
    fieldId: z.string().optional(),
    value: z.string().max(300),
  })
  .superRefine((v, ctx) => {
    const enums: Partial<Record<typeof v.field, readonly string[]>> = {
      category: categories,
      stage: stages,
      priority: priorities,
      availability: availabilities,
      health: healthStates,
      taskState: ["Due today", "Overdue", "Upcoming", "Completed", "None"],
      opportunityStatus: ["open", "won", "lost", "none"],
    };
    if (
      [
        "customField",
        "pipelineId",
        "pinned",
        "industry",
        "representativePriority",
        "noRepresentatives",
        "closingSoon",
        "opportunityStage",
      ].includes(v.field)
    )
      return;
    if (
      v.field === "daysSince"
        ? !["atLeast", "atMost"].includes(v.operator) ||
          !/^\d+$/.test(v.value) ||
          Number(v.value) > 36500
        : v.field === "tag"
          ? !["contains", "is"].includes(v.operator) || !v.value.trim()
          : v.operator !== "is" ||
            (enums[v.field] && !enums[v.field]!.includes(v.value))
    )
      ctx.addIssue({
        code: "custom",
        message: "Choose a supported condition and value.",
      });
  });
export const smartListSchema = z.object({
  ...base,
  name: z.string().trim().min(1).max(100),
  mode: z.enum(["all", "any"]),
  conditions: z.array(conditionSchema).min(1).max(10),
  entityType: z.enum(["contact", "organization"]).default("contact"),
});
export const recommendationActionSchema = z.object({
  ...base,
  key: z.string().min(1).max(1000),
  recordId: z.string(),
  kind: z.enum(["snooze", "dismiss"]),
  until: z.string().datetime().nullable(),
});
export const importBatchSchema = z.object({
  ...base,
  fileName: z.string().max(300),
  createdContacts: z.number().int().nonnegative(),
  updatedContacts: z.number().int().nonnegative(),
  createdOrganizations: z.number().int().nonnegative(),
  updatedOrganizations: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  invalid: z.number().int().nonnegative(),
});
export type SmartList = Omit<z.infer<typeof smartListSchema>, "entityType"> & {
  entityType?: "contact" | "organization";
};
export type RecommendationAction = z.infer<typeof recommendationActionSchema>;
export type ImportBatch = z.infer<typeof importBatchSchema>;
export type Health = (typeof healthStates)[number];
export const settingsSchema = z.object({
  id: z.literal("settings"),
  theme: z.enum(["light", "dark", "system"]),
  name: z.string().max(80),
  locale: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat(v);
      return true;
    } catch {
      return false;
    }
  }, "Invalid locale"),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid timezone"),
  reconnectDays: z.number().int().min(1).max(365),
  priorityDays: z.number().int().min(1).max(365),
  followUpDays: z.number().int().min(1).max(365),
  timeoutDays: z.number().int().min(1).max(365),
  alerts: z.object({
    followUps: z.boolean(),
    tasks: z.boolean(),
    relationships: z.boolean(),
  }),
  gamification: z.boolean(),
  progress: progressPreferencesSchema.prefault({}),
  ai: aiPreferencesSchema.prefault({}),
  onboarding: z
    .object({
      hidden: z.boolean().default(false),
      exportInitiatedAt: z.string().datetime().nullable().default(null),
    })
    .prefault({}),
  identity: z
    .object({
      workspaceName: z.string().trim().max(80).default("My workspace"),
      avatarMediaId: z.string().max(200).default(""),
      accent: z
        .enum(["periwinkle", "forest", "coral", "blue"])
        .default("periwinkle"),
    })
    .prefault({}),
  focus: z
    .object({
      homeLayout: z
        .enum(["balanced", "focused", "compact"])
        .default("balanced"),
      shortcuts: z.boolean().default(true),
      reminders: z.boolean().default(false),
      progress: z.boolean().default(true),
      landing: z.enum(["home", "focus"]).default("home"),
      lastPipelineId: z.string().default(""),
    })
    .prefault({}),
  reducedMotion: z.boolean(),
  dismissed: z.array(z.string()),
  intelligence: intelligenceSchema.prefault({}),
  pipeline: z.object({
    id: z.string(),
    name: z.string(),
    stages: z.array(z.enum(stages)),
    currency: z.string(),
  }),
});
export type Organization = z.infer<typeof organizationSchema>;
export type Contact = z.infer<typeof contactSchema>;
export type Interaction = z.infer<typeof interactionSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Opportunity = z.infer<typeof opportunitySchema>;
export type ActivityEvent = z.infer<typeof eventSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type Restriction = z.infer<typeof restrictionSchema>;
export type Permission = z.infer<typeof permissionSchema>;
export const gamificationSchema = z.object({
  id: z.string(),
  xp: z.number().nonnegative(),
  level: z.number().int().nonnegative(),
  achievements: z.array(z.string()),
  completedQuests: z.array(z.string()),
  streakHistory: z.array(z.string()),
  progress: z.record(z.string(), z.number()),
});
export const integrationSchema = z.object({
  id: z.string(),
  provider: z.string(),
  status: z.enum(["disconnected", "connected"]),
  features: z.array(z.string()),
  scopes: z.array(z.string()),
  lastSyncAt: z.string().datetime().nullable(),
});
export type GamificationState = z.infer<typeof gamificationSchema>;
export type IntegrationConfiguration = z.infer<typeof integrationSchema>;
export type Workspace = "demo" | "personal";
export const defaults: Settings = {
  id: "settings",
  theme: "system",
  name: "Alex",
  locale: "en-US",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  reconnectDays: 21,
  priorityDays: 7,
  followUpDays: 7,
  timeoutDays: 30,
  alerts: { followUps: true, tasks: true, relationships: true },
  gamification: true,
  progress: progressPreferencesSchema.parse({}),
  ai: aiPreferencesSchema.parse({}),
  onboarding: { hidden: false, exportInitiatedAt: null },
  identity: {
    workspaceName: "My workspace",
    avatarMediaId: "",
    accent: "periwinkle",
  },
  focus: {
    homeLayout: "balanced",
    shortcuts: true,
    reminders: false,
    progress: true,
    landing: "home",
    lastPipelineId: "",
  },
  reducedMotion: false,
  dismissed: [],
  intelligence: intelligenceSchema.parse({}),
  pipeline: {
    id: "default",
    name: "Relationship pipeline",
    stages: [...stages],
    currency: "USD",
  },
};
export const stamp = () => {
  const now = new Date().toISOString();
  return {
    id:
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : Array.from(crypto.getRandomValues(new Uint8Array(16)), (v) =>
            v.toString(16).padStart(2, "0"),
          ).join(""),
    createdAt: now,
    updatedAt: now,
  };
};
