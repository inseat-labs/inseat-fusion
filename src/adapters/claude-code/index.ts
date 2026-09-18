import { z } from "zod";
import type { AdapterCapabilities, ResultEnvelope } from "../../schemas/adapter.js";
import type { Adapter, InvocationRequest } from "../types.js";

export const claudeCodeCapabilities: AdapterCapabilities = {
  adapter: "claude-code",
  cliName: "claude",
  noninteractiveFlag: "-p",
  structuredOutput: "json",
  supportsReadOnlyMode: true,
  supportsModelSelection: true,
  reportsUsage: true,
  documentationUrl: "https://docs.anthropic.com/en/docs/claude-code/sdk/sdk-headless",
  documentationCheckedOn: "2026-09-16",
};

const ClaudeJsonResult = z.object({
  type: z.literal("result"),
  subtype: z.string(),
  is_error: z.boolean().optional(),
  result: z.string().optional(),
  total_cost_usd: z.number().optional(),
  usage: z
    .object({
      input_tokens: z.number().int().optional(),
      output_tokens: z.number().int().optional(),
    })
    .optional(),
});

export const claudeCodeAdapter: Adapter = {
  capabilities: claudeCodeCapabilities,

  planInvocation(request: InvocationRequest) {
    const args = ["-p", request.instruction, "--output-format", "json", "--model", request.binding.model];
    if (request.readOnly) {
      args.push("--allowedTools", "Read,Grep,Glob");
    } else {
      args.push("--permission-mode", "acceptEdits");
    }
    return {
      adapter: "claude-code",
      executable: "claude",
      args,
      cwd: request.cwd,
      readOnly: request.readOnly,
      credentialSource: "user-cli-login",
      timeoutSeconds: request.timeoutSeconds,
    };
  },

  parseOutput(raw: string, exitCode: number | null): ResultEnvelope {
    const base = { version: 1 as const, adapter: "claude-code" as const, exitCode, changedFiles: [], warnings: [] as string[] };
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return { ...base, model: null, outcome: "malformed-output", summary: "stdout was not valid JSON", usage: { status: "unavailable", reason: "output unparseable" }, rawKind: "text" };
    }
    const parsed = ClaudeJsonResult.safeParse(json);
    if (!parsed.success) {
      return { ...base, model: null, outcome: "schema-drift", summary: `result envelope did not match the expected shape: ${parsed.error.issues[0]?.message ?? "unknown"}`, usage: { status: "unavailable", reason: "shape mismatch" }, rawKind: "json" };
    }
    const r = parsed.data;
    const usage =
      r.usage || r.total_cost_usd !== undefined
        ? { status: "reported" as const, inputTokens: r.usage?.input_tokens, outputTokens: r.usage?.output_tokens, costUsd: r.total_cost_usd, source: "claude --output-format json" }
        : { status: "unavailable" as const, reason: "usage block absent" };
    const outcome = r.is_error || r.subtype !== "success" ? ("failed" as const) : ("succeeded" as const);
    return { ...base, model: null, outcome, summary: r.result ?? r.subtype, usage, rawKind: "json" };
  },
};
