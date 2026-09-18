import { z } from "zod";
import { BudgetSchema, ModelBindingSchema, RiskLevelSchema, SCHEMA_VERSION, WorkflowKindSchema } from "./common.js";

export const VerificationCommandSchema = z.object({
  name: z.string().min(1),
  command: z.array(z.string().min(1)).min(1),
  required: z.boolean().default(true),
});

export const TaskSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  id: z.string().min(1),
  title: z.string().min(1),
  instruction: z.string().min(1),
  repository: z.object({
    path: z.string().min(1),
    baseRevision: z.string().min(1),
  }),
  risk: RiskLevelSchema,
  touchesPaths: z.array(z.string().min(1)).default([]),
  bindings: z.object({
    primary: ModelBindingSchema,
    escalation: ModelBindingSchema.optional(),
    critic: ModelBindingSchema.optional(),
  }),
  budget: BudgetSchema,
  verification: z.array(VerificationCommandSchema).default([]),
  forceWorkflow: WorkflowKindSchema.optional(),
});
export type Task = z.infer<typeof TaskSchema>;
