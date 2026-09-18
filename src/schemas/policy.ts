import { z } from "zod";
import { RiskLevelSchema, SCHEMA_VERSION, WorkflowKindSchema } from "./common.js";

export const PolicyRuleSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  when: z.object({
    risk: z.array(RiskLevelSchema).optional(),
    minVerificationCommands: z.number().int().nonnegative().optional(),
    requiresCriticBinding: z.boolean().optional(),
    requiresEscalationBinding: z.boolean().optional(),
    minBudgetUsd: z.number().nonnegative().optional(),
  }),
  select: WorkflowKindSchema,
});
export type PolicyRule = z.infer<typeof PolicyRuleSchema>;

export const PolicySchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  name: z.string().min(1),
  rules: z.array(PolicyRuleSchema).min(1),
  fallback: WorkflowKindSchema,
});
export type Policy = z.infer<typeof PolicySchema>;

export const PolicyDecisionSchema = z.object({
  policy: z.string(),
  selected: WorkflowKindSchema,
  ruleId: z.string().nullable(),
  forced: z.boolean(),
  inputs: z.record(z.string(), z.unknown()),
  explanation: z.string(),
});
export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;
