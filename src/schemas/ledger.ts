import { z } from "zod";
import { LegRoleSchema, ModelBindingSchema, SCHEMA_VERSION, UsageEvidenceSchema, WorkflowKindSchema } from "./common.js";
import { OutcomeSchema } from "./adapter.js";
import { PolicyDecisionSchema } from "./policy.js";

export const LedgerLegSchema = z.object({
  index: z.number().int().nonnegative(),
  role: LegRoleSchema,
  binding: ModelBindingSchema,
  startedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
  outcome: z.union([OutcomeSchema, z.literal("not-run")]),
  usage: UsageEvidenceSchema,
  verificationPassed: z.boolean().nullable(),
});

export const LedgerSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  workflowId: z.string().min(1),
  taskId: z.string().min(1),
  mode: z.enum(["dry-run", "execute"]),
  baseRevision: z.string().min(1),
  decision: PolicyDecisionSchema,
  workflow: WorkflowKindSchema,
  legs: z.array(LedgerLegSchema),
  repairsUsed: z.number().int().min(0).max(1),
  selectedLeg: z.number().int().nullable(),
  applied: z.boolean(),
  createdAt: z.string(),
});
export type Ledger = z.infer<typeof LedgerSchema>;
