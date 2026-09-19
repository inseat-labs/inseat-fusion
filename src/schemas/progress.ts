import { z } from "zod";
import { SCHEMA_VERSION } from "./common.js";

export const LegStateSchema = z.enum([
  "planned",
  "ready",
  "running",
  "succeeded",
  "failed",
  "timed-out",
  "cancelled",
  "budget-exhausted",
  "malformed-output",
  "schema-drift",
]);
export type LegState = z.infer<typeof LegStateSchema>;

export const TERMINAL_STATES: readonly LegState[] = [
  "succeeded",
  "failed",
  "timed-out",
  "cancelled",
  "budget-exhausted",
  "malformed-output",
  "schema-drift",
];

export const ProgressOriginSchema = z.enum(["dry-run-simulation", "runtime"]);
export type ProgressOrigin = z.infer<typeof ProgressOriginSchema>;

export const ProgressReasonSchema = z.object({
  code: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "reason.code must be kebab-case"),
  message: z.string().min(1),
});

export const ProgressEventSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  workflowId: z.string().min(1),
  legId: z.string().regex(/^leg-\d+$/, "legId must look like leg-<index>"),
  sequence: z.number().int().nonnegative(),
  timestamp: z.string().datetime(),
  state: LegStateSchema,
  reason: ProgressReasonSchema,
  origin: ProgressOriginSchema,
  evidenceRef: z.string().min(1).optional(),
});
export type ProgressEvent = z.infer<typeof ProgressEventSchema>;

export const ProgressStreamSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  workflowId: z.string().min(1),
  origin: ProgressOriginSchema,
  events: z.array(ProgressEventSchema),
});
export type ProgressStream = z.infer<typeof ProgressStreamSchema>;
