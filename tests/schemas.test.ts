import { describe, expect, it } from "vitest";
import { PolicySchema } from "../src/schemas/policy.js";
import { TaskSchema } from "../src/schemas/task.js";
import { DEFAULT_POLICY } from "../src/policy/default-policy.js";

describe("schemas", () => {
  it("default policy satisfies PolicySchema", () => {
    expect(PolicySchema.parse(DEFAULT_POLICY)).toBeTruthy();
  });

  it("task rejects an unknown adapter", () => {
    const r = TaskSchema.safeParse({
      version: 1, id: "t", title: "t", instruction: "x",
      repository: { path: "/r", baseRevision: "a" }, risk: "low",
      bindings: { primary: { adapter: "gemini-cli", model: "m" } },
      budget: { timeoutSeconds: 1 },
    });
    expect(r.success).toBe(false);
  });

  it("task requires a timeout", () => {
    const r = TaskSchema.safeParse({
      version: 1, id: "t", title: "t", instruction: "x",
      repository: { path: "/r", baseRevision: "a" }, risk: "low",
      bindings: { primary: { adapter: "codex", model: "m" } },
      budget: {},
    });
    expect(r.success).toBe(false);
  });
});
