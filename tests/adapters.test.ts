import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { claudeCodeAdapter } from "../src/adapters/claude-code/index.js";
import { codexAdapter } from "../src/adapters/codex/index.js";
import { ResultEnvelopeSchema } from "../src/schemas/adapter.js";

const dir = join(import.meta.dirname, "..", "fixtures", "adapters");
const load = (adapter: string, file: string) => readFile(join(dir, adapter, file), "utf8");

describe("claude-code adapter", () => {
  it("plans a read-only critic invocation without edit permissions", () => {
    const plan = claudeCodeAdapter.planInvocation({ binding: { adapter: "claude-code", model: "m" }, instruction: "review", cwd: "/w", readOnly: true, timeoutSeconds: 10 });
    expect(plan.readOnly).toBe(true);
    expect(plan.args).toContain("--allowedTools");
    expect(plan.args).not.toContain("acceptEdits");
    expect(plan.credentialSource).toBe("user-cli-login");
  });

  it.each([
    ["success.json", "succeeded", "reported"],
    ["error.json", "failed", "reported"],
    ["missing-usage.json", "succeeded", "unavailable"],
    ["malformed.txt", "malformed-output", "unavailable"],
    ["schema-drift.json", "schema-drift", "unavailable"],
  ])("%s -> %s / usage %s", async (file, outcome, usage) => {
    const env = claudeCodeAdapter.parseOutput(await load("claude-code", file), 0);
    expect(ResultEnvelopeSchema.parse(env)).toBeTruthy();
    expect(env.outcome).toBe(outcome);
    expect(env.usage.status).toBe(usage);
  });
});

describe("codex adapter", () => {
  it("plans a read-only sandbox for critics", () => {
    const plan = codexAdapter.planInvocation({ binding: { adapter: "codex", model: "m" }, instruction: "review", cwd: "/w", readOnly: true, timeoutSeconds: 10 });
    expect(plan.args).toContain("read-only");
    expect(plan.args[0]).toBe("exec");
  });

  it.each([
    ["success.jsonl", "succeeded", "reported"],
    ["incomplete.jsonl", "failed", "unavailable"],
    ["missing-usage.jsonl", "succeeded", "unavailable"],
    ["malformed.jsonl", "malformed-output", "unavailable"],
    ["schema-drift.jsonl", "schema-drift", "unavailable"],
  ])("%s -> %s / usage %s", async (file, outcome, usage) => {
    const env = codexAdapter.parseOutput(await load("codex", file), 0);
    expect(ResultEnvelopeSchema.parse(env)).toBeTruthy();
    expect(env.outcome).toBe(outcome);
    expect(env.usage.status).toBe(usage);
  });

  it("never invents usage numbers when they are absent", async () => {
    const env = codexAdapter.parseOutput(await load("codex", "missing-usage.jsonl"), 0);
    expect(env.usage).toEqual({ status: "unavailable", reason: "turn.completed had no usage" });
  });
});
