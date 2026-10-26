import { z } from "zod";
const base = {
  id: z.string().min(1).max(300),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
};
export const entityTypes = [
  "contact",
  "organization",
  "opportunity",
  "task",
] as const;
export const fieldDefinitionSchema = z.object({
  ...base,
  entityType: z.enum(["contact", "organization", "opportunity"]),
  label: z.string().trim().min(1).max(80),
  description: z.string().max(500),
  type: z.enum(["text", "longText", "number", "date", "checkbox", "select"]),
  choices: z.array(z.string().trim().min(1).max(100)).max(30),
  position: z.number().int().nonnegative(),
  visible: z.boolean(),
  archived: z.boolean(),
});
export const fieldValueSchema = z.object({
  ...base,
  fieldId: z.string().min(1),
  recordId: z.string().min(1),
  value: z.union([
    z.string().max(10000),
    z.number().finite().min(-1e12).max(1e12),
    z.boolean(),
  ]),
});
export const focusSchema = z.object({
  ...base,
  entityType: z.enum(entityTypes),
  recordId: z.string().min(1),
  today: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});
export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;
export type FieldValue = z.infer<typeof fieldValueSchema>;
export type FocusItem = z.infer<typeof focusSchema>;
export function validateFieldValue(
  field: FieldDefinition,
  value: FieldValue["value"],
) {
  const valid =
    field.type === "number"
      ? typeof value === "number" &&
        Number.isFinite(value) &&
        Math.abs(value) <= 1e12
      : field.type === "checkbox"
        ? typeof value === "boolean"
        : typeof value === "string" &&
          (field.type === "select"
            ? field.choices.includes(value)
            : field.type === "date"
              ? /^\d{4}-\d{2}-\d{2}$/.test(value) &&
                !Number.isNaN(Date.parse(value)) &&
                new Date(value).toISOString().slice(0, 10) === value
              : value.length <= (field.type === "text" ? 300 : 10000));
  if (!valid) throw new Error(`Invalid value for ${field.label}.`);
}
