import { z } from "zod";
import { AdapterIdSchema, SCHEMA_VERSION, UsageEvidenceSchema } from "./common.js";

export const AdapterCapabilitiesSchema = z.object({
  adapter: AdapterIdSchema,
  cliName: z.string().min(1),
  noninteractiveFlag: z.string().min(1),
  structuredOutput: z.enum(["json", "json-stream", "none"]),
  supportsReadOnlyMode: z.boolean(),
  supportsModelSelection: z.boolean(),
  reportsUsage: z.boolean(),
  documentationUrl: z.string().url(),
  documentationCheckedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type AdapterCapabilities = z.infer<typeof AdapterCapabilitiesSchema>;

export const InvocationPlanSchema = z.object({
  adapter: AdapterIdSchema,
  executable: z.string().min(1),
  args: z.array(z.string()),
  cwd: z.string().min(1),
  readOnly: z.boolean(),
  credentialSource: z.literal("user-cli-login"),
  timeoutSeconds: z.number().int().positive(),
});
export type InvocationPlan = z.infer<typeof InvocationPlanSchema>;

export const OutcomeSchema = z.enum([
  "succeeded",
  "failed",
  "timed-out",
  "cancelled",
  "malformed-output",
  "schema-drift",
]);
export type Outcome = z.infer<typeof OutcomeSchema>;

export const ResultEnvelopeSchema = z.object({
  version: z.literal(SCHEMA_VERSION),
  adapter: AdapterIdSchema,
  model: z.string().nullable(),
  outcome: OutcomeSchema,
  exitCode: z.number().int().nullable(),
  summary: z.string(),
  changedFiles: z.array(z.string()),
  usage: UsageEvidenceSchema,
  rawKind: z.string(),
  warnings: z.array(z.string()),
});
export type ResultEnvelope = z.infer<typeof ResultEnvelopeSchema>;
