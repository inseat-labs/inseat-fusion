import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

export const AdapterIdSchema = z.enum(["claude-code", "codex"]);
export type AdapterId = z.infer<typeof AdapterIdSchema>;

export const WorkflowKindSchema = z.enum(["single", "cascade", "critique"]);
export type WorkflowKind = z.infer<typeof WorkflowKindSchema>;

export const LegRoleSchema = z.enum(["solver", "escalation-solver", "critic", "repair-solver"]);
export type LegRole = z.infer<typeof LegRoleSchema>;

export const RiskLevelSchema = z.enum(["low", "medium", "high"]);
export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const ModelBindingSchema = z.object({
  adapter: AdapterIdSchema,
  model: z.string().min(1),
});
export type ModelBinding = z.infer<typeof ModelBindingSchema>;

export const BudgetSchema = z.object({
  maxUsd: z.number().nonnegative().optional(),
  maxInputTokens: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  timeoutSeconds: z.number().int().positive(),
});
export type Budget = z.infer<typeof BudgetSchema>;

export const UnavailableSchema = z.object({
  status: z.literal("unavailable"),
  reason: z.string().min(1),
});

export const UsageEvidenceSchema = z.union([
  z.object({
    status: z.literal("reported"),
    inputTokens: z.number().int().nonnegative().optional(),
    cachedInputTokens: z.number().int().nonnegative().optional(),
    outputTokens: z.number().int().nonnegative().optional(),
    reasoningOutputTokens: z.number().int().nonnegative().optional(),
    costUsd: z.number().nonnegative().optional(),
    costIsEstimate: z.boolean().optional(),
    source: z.string().min(1),
  }),
  UnavailableSchema,
]);
export type UsageEvidence = z.infer<typeof UsageEvidenceSchema>;
