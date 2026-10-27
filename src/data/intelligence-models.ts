import { z } from "zod";
const id = z.string().min(1).max(300);
const date = z.string().datetime();
export const transitionSchema = z.object({
  id,
  opportunityId: z.string().min(1),
  occurredAt: date,
  previousPipelineId: id,
  pipelineId: id,
  previousStageId: id,
  stageId: id,
  previousPipelineName: z.string().max(200),
  pipelineName: z.string().max(200),
  previousStageName: z.string().max(200),
  stageName: z.string().max(200),
  previousOutcome: z.enum(["open", "won", "lost"]),
  outcome: z.enum(["open", "won", "lost"]),
  source: z.enum(["user", "configuration"]),
});
export const automationRuleSchema = z
  .object({
    id: z.string().min(1).max(160),
    name: z.string().trim().min(1).max(100),
    description: z.string().max(500),
    createdAt: date,
    updatedAt: date,
    enabled: z.boolean(),
    enabledAt: date.nullable(),
    archived: z.boolean().default(false),
    trigger: z.enum(["stage", "closing", "due", "overdue", "inactive"]),
    pipelineId: z.string().max(300),
    stageId: z.string().max(300),
    days: z.number().int().min(1).max(365),
    priority: z.enum(["", "VIP", "High", "Normal", "Low"]),
    category: z.string().max(100),
    action: z.enum(["task", "reminder"]),
    taskTitle: z.string().trim().min(1).max(200),
    delayDays: z.number().int().min(0).max(90),
  })
  .superRefine((r, ctx) => {
    if (r.enabled !== !!r.enabledAt)
      ctx.addIssue({
        code: "custom",
        message: "Enabled rules need an activation time.",
      });
    if (
      ![
        "",
        "Prospect",
        "Lead",
        "Active client",
        "Former client",
        "Partner",
        "Vendor",
        "Other",
      ].includes(r.category)
    )
      ctx.addIssue({ code: "custom", message: "Invalid person category." });
    if (r.trigger === "stage" && (!r.pipelineId || !r.stageId))
      ctx.addIssue({ code: "custom", message: "Choose a pipeline and stage." });
  });
export const automationExecutionSchema = z.object({
  id: z.string().min(1),
  ruleId: id,
  occurrenceId: z.string().min(1),
  sourceType: z.enum(["opportunity", "task", "contact"]),
  sourceId: z.string().min(1),
  sourceDeleted: z.boolean().default(false),
  resultDeleted: z.boolean().default(false),
  action: z.enum(["task", "reminder"]),
  status: z.enum(["completed", "blocked", "skipped", "failed"]),
  resultId: z.string().max(300).nullable(),
  at: date,
  explanation: z.string().max(300),
});
export const automationControlSchema = z.object({
  id: z.literal("automation"),
  paused: z.boolean(),
  replayAfter: date,
});
export type OpportunityTransition = z.infer<typeof transitionSchema>;
export type AutomationRule = z.infer<typeof automationRuleSchema>;
export type AutomationExecution = z.infer<typeof automationExecutionSchema>;
export type AutomationControl = z.infer<typeof automationControlSchema>;
