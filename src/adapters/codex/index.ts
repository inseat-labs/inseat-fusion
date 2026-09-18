import { z } from "zod";
import type { AdapterCapabilities, ResultEnvelope } from "../../schemas/adapter.js";
import type { Adapter, InvocationRequest } from "../types.js";

export const codexCapabilities: AdapterCapabilities = {
  adapter: "codex",
  cliName: "codex",
  noninteractiveFlag: "exec",
  structuredOutput: "json-stream",
  supportsReadOnlyMode: true,
  supportsModelSelection: true,
  reportsUsage: true,
  documentationUrl: "https://github.com/openai/codex",
  documentationCheckedOn: "2026-09-16",
};

const CodexEvent = z.object({ type: z.string() }).passthrough();
const CodexTurnCompleted = z.object({
  type: z.literal("turn.completed"),
  usage: z
    .object({
      input_tokens: z.number().int().optional(),
      output_tokens: z.number().int().optional(),
    })
    .optional(),
});
const CodexItemCompleted = z.object({
  type: z.literal("item.completed"),
  item: z.object({ type: z.string(), text: z.string().optional() }).passthrough(),
});

export const codexAdapter: Adapter = {
  capabilities: codexCapabilities,

  planInvocation(request: InvocationRequest) {
    const args = ["exec", "--json", "--model", request.binding.model];
    args.push("--sandbox", request.readOnly ? "read-only" : "workspace-write");
    args.push(request.instruction);
    return {
      adapter: "codex",
      executable: "codex",
      args,
      cwd: request.cwd,
      readOnly: request.readOnly,
      credentialSource: "user-cli-login",
      timeoutSeconds: request.timeoutSeconds,
    };
  },

  parseOutput(raw: string, exitCode: number | null): ResultEnvelope {
    const base = { version: 1 as const, adapter: "codex" as const, model: null, exitCode, changedFiles: [], warnings: [] as string[] };
    const lines = raw.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) {
      return { ...base, outcome: "malformed-output", summary: "no output lines", usage: { status: "unavailable", reason: "empty output" }, rawKind: "jsonl" };
    }
    const events: unknown[] = [];
    for (const line of lines) {
      try {
        events.push(JSON.parse(line));
      } catch {
        return { ...base, outcome: "malformed-output", summary: "a JSONL line was not valid JSON", usage: { status: "unavailable", reason: "output unparseable" }, rawKind: "jsonl" };
      }
    }
    if (!events.every((e) => CodexEvent.safeParse(e).success)) {
      return { ...base, outcome: "schema-drift", summary: "an event lacked a string `type` field", usage: { status: "unavailable", reason: "shape mismatch" }, rawKind: "jsonl" };
    }
    const completed = events.map((e) => CodexTurnCompleted.safeParse(e)).find((r) => r.success);
    const messages = events.map((e) => CodexItemCompleted.safeParse(e)).filter((r) => r.success).map((r) => r.data.item);
    const lastMessage = [...messages].reverse().find((m) => m.type === "agent_message")?.text;
    if (!completed) {
      return { ...base, outcome: "failed", summary: lastMessage ?? "stream ended without turn.completed", usage: { status: "unavailable", reason: "turn.completed event absent" }, rawKind: "jsonl" };
    }
    const usage = completed.data.usage
      ? { status: "reported" as const, inputTokens: completed.data.usage.input_tokens, outputTokens: completed.data.usage.output_tokens, source: "codex exec --json turn.completed" }
      : { status: "unavailable" as const, reason: "turn.completed had no usage" };
    return { ...base, outcome: exitCode === 0 || exitCode === null ? "succeeded" : "failed", summary: lastMessage ?? "turn completed", usage, rawKind: "jsonl" };
  },
};
