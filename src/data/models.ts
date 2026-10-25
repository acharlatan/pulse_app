import { z } from "zod";
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
  location: z.string(),
  tags: z.array(z.string()),
  customFields: z.record(z.string()),
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
  category: z.enum(categories),
  stage: z.enum(stages),
  availability: z.enum(availabilities),
  timeoutUntil: z.string().datetime().nullable(),
  priority: z.enum(priorities),
  tags: z.array(z.string()),
  nextFollowUp: z.string().datetime().nullable(),
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
});
export const taskSchema = z.object({
  ...base,
  title: z.string().trim().min(1).max(300),
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
  stageId: z.enum(stages),
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
  contactId: z.string().nullable(),
  organizationId: z.string().nullable(),
  summary: z.string(),
});
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
  reducedMotion: z.boolean(),
  dismissed: z.array(z.string()),
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
  progress: z.record(z.number()),
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
  reducedMotion: false,
  dismissed: [],
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
