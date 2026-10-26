import { z } from "zod";
export const operations = [
  "catch-up",
  "ask",
  "draft",
  "extract-actions",
] as const;
export const recordSchema = z
  .object({
    id: z.string().min(1).max(220),
    kind: z.enum([
      "contact",
      "organization",
      "interaction",
      "note",
      "task",
      "opportunity",
    ]),
    text: z.string().max(1500),
    at: z.string().datetime().nullable(),
    state: z.string().max(100).optional(),
    value: z.string().max(100).optional(),
  })
  .strict();
export const contextSchema = z
  .object({
    scope: z.enum(["contact", "organization", "opportunity"]),
    targetId: z.string().min(1).max(200),
    label: z.string().max(200),
    now: z.string().datetime(),
    timezone: z
      .string()
      .max(100)
      .refine((value) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: value });
          return true;
        } catch {
          return false;
        }
      }, "Unsupported timezone."),
    restricted: z.boolean(),
    records: z.array(recordSchema).max(20),
    omitted: z.number().int().nonnegative(),
    dateFrom: z
      .string()
      .refine(
        (value) =>
          !value ||
          (/^\d{4}-\d{2}-\d{2}$/.test(value) &&
            !Number.isNaN(Date.parse(value + "T00:00:00Z")) &&
            new Date(value + "T00:00:00Z").toISOString().slice(0, 10) ===
              value),
        "Invalid date filter.",
      ),
  })
  .strict();
export const aiRequestSchema = z
  .object({
    version: z.literal(1),
    requestId: z.string().uuid(),
    operation: z.enum(operations),
    context: contextSchema,
    question: z.string().trim().max(1000),
    text: z.string().max(4000),
    tone: z.enum(["Professional", "Friendly", "Warm", "Concise", "Direct"]),
    length: z.enum(["Short", "Standard", "Detailed"]),
    channel: z.enum(["Email", "WhatsApp", "General"]),
    purpose: z.enum(["Relationship", "Marketing"]),
  })
  .strict()
  .superRefine((r, c) => {
    if (r.operation === "ask" && !r.question)
      c.addIssue({ code: "custom", message: "Enter a question." });
    if (r.operation === "draft" && r.context.restricted)
      c.addIssue({ code: "custom", message: "Outreach is restricted." });
    if (!r.context.records.length && !r.text.trim())
      c.addIssue({
        code: "custom",
        message: "Select relevant records or enter a note.",
      });
  });
const claim = z
  .object({
    text: z.string().min(1).max(1200),
    refs: z.array(z.string().min(1).max(220)).min(1).max(8),
  })
  .strict();
export const aiResultSchema = z
  .object({
    facts: z.array(claim).max(8),
    suggestions: z.array(z.string().max(600)).max(5),
    missing: z.array(z.string().max(600)).max(5),
    draft: z
      .object({ subject: z.string().max(150), body: z.string().max(4000) })
      .strict()
      .nullable(),
    actions: z
      .array(
        z
          .object({
            title: z.string().min(1).max(300),
            description: z.string().max(1000),
            dueAt: z.string().datetime().nullable(),
            refs: z.array(z.string().max(220)).max(8),
            reason: z.string().max(400),
          })
          .strict(),
      )
      .max(5),
  })
  .strict();
export type AIRequest = z.infer<typeof aiRequestSchema>;
export type AIResult = z.infer<typeof aiResultSchema>;
export type AIContext = z.infer<typeof contextSchema>;
export const resultJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["facts", "suggestions", "missing", "draft", "actions"],
  properties: {
    facts: {
      type: "array",
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["text", "refs"],
        properties: {
          text: { type: "string" },
          refs: { type: "array", items: { type: "string" } },
        },
      },
    },
    suggestions: { type: "array", items: { type: "string" } },
    missing: { type: "array", items: { type: "string" } },
    draft: {
      anyOf: [
        {
          type: "object",
          additionalProperties: false,
          required: ["subject", "body"],
          properties: { subject: { type: "string" }, body: { type: "string" } },
        },
        { type: "null" },
      ],
    },
    actions: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "description", "dueAt", "refs", "reason"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          dueAt: { anyOf: [{ type: "string" }, { type: "null" }] },
          refs: { type: "array", items: { type: "string" } },
          reason: { type: "string" },
        },
      },
    },
  },
};
export function validateResult(input: unknown, request: AIRequest) {
  const r = aiResultSchema.parse(input);
  const ids = new Set([
    ...request.context.records.map((r) => r.id),
    ...(request.text.trim() ? ["input-note"] : []),
  ]);
  if ([...r.facts, ...r.actions].some((c) => c.refs.some((id) => !ids.has(id))))
    throw new Error(
      "The response cited information outside the approved context.",
    );
  if (request.operation !== "draft" && r.draft)
    throw new Error("Unexpected draft output.");
  if (request.operation !== "extract-actions" && r.actions.length)
    throw new Error("Unexpected action output.");
  if (request.operation === "draft" && !r.draft)
    throw new Error("The provider returned no draft.");
  return r;
}
export const aiPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  notes: z.boolean().default(false),
  opportunities: z.boolean().default(true),
  values: z.boolean().default(false),
  channels: z.boolean().default(false),
});
