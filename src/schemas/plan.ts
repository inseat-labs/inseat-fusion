import { z } from "zod";
import { BudgetSchema, LegRoleSchema, ModelBindingSchema, SCHEMA_VERSION, WorkflowKindSchema } from "./common.js";
import { InvocationPlanSchema } from "./adapter.js";
import { PolicyDecisionSchema } from "./policy.js";
import { LegStateSchema } from "./progress.js";

export const GateSchema = z.object({
  id: z.string().min(1),
  description: z.string().min(1),
  deterministic: z.literal(true),
});

export const PlannedLegSchema = z.object({
  index: z.number().int().nonnegative(),
  role: LegRoleSchema,
  binding: ModelBindingSchema,
  readOnly: z.boolean(),
  worktree: z.enum(["isolated-solver", "none"]),
  budget: BudgetSchema,
  invocation: InvocationPlanSchema,
  gatesAfter: z.array(GateSchema),
  runsIf: z.string(),
});
export type PlannedLeg = z.infer<typeof PlannedLegSchema>;

export const DryRunPlanSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  mode: z.literal("dry-run"),
  taskId: z.string(),
  baseRevision: z.string(),
  workflow: WorkflowKindSchema,
  decision: PolicyDecisionSchema,
  legs: z.array(PlannedLegSchema).min(1),
  maxRepairs: z.number().int().min(0).max(1),
  finalGates: z.array(GateSchema),
  progressModel: z.object({
    kind: z.literal("specification"),
    note: z.string(),
    states: z.array(LegStateSchema),
    terminalStates: z.array(LegStateSchema),
    transitions: z.record(z.string(), z.array(LegStateSchema)),
  }),
  estimatedCost: z.union([
    z.object({ status: z.literal("bounded"), maxUsd: z.number().nonnegative() }),
    z.object({ status: z.literal("unavailable"), reason: z.string() }),
  ]),
  invariants: z.array(z.string().min(1)),
});
export type DryRunPlan = z.infer<typeof DryRunPlanSchema>;
