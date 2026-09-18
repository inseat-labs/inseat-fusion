import { describe, expect, it } from "vitest";
import { DEFAULT_POLICY } from "../src/policy/default-policy.js";
import { selectWorkflow } from "../src/policy/select.js";
import type { Task } from "../src/schemas/task.js";

const base: Task = {
  version: 1,
  id: "t",
  title: "t",
  instruction: "do it",
  repository: { path: "/r", baseRevision: "abc" },
  risk: "low",
  touchesPaths: [],
  bindings: { primary: { adapter: "codex", model: "m" } },
  budget: { timeoutSeconds: 60 },
  verification: [],
};
const escalation = { adapter: "claude-code" as const, model: "e" };
const critic = { adapter: "claude-code" as const, model: "c" };

describe("selectWorkflow (default policy)", () => {
  it("selects single for low risk", () => {
    const d = selectWorkflow(base, DEFAULT_POLICY);
    expect(d.selected).toBe("single");
    expect(d.ruleId).toBe("low-risk-single");
    expect(d.forced).toBe(false);
  });

  it("selects cascade for medium risk with escalation and verification", () => {
    const d = selectWorkflow(
      { ...base, risk: "medium", bindings: { ...base.bindings, escalation }, verification: [{ name: "t", command: ["x"], required: true }] },
      DEFAULT_POLICY,
    );
    expect(d.selected).toBe("cascade");
    expect(d.ruleId).toBe("medium-risk-cascade");
  });

  it("falls back to single for medium risk without an escalation binding", () => {
    const d = selectWorkflow({ ...base, risk: "medium" }, DEFAULT_POLICY);
    expect(d.selected).toBe("single");
    expect(d.ruleId).toBeNull();
    expect(d.explanation).toMatch(/fallback/);
  });

  it("selects critique for high risk with a critic", () => {
    const d = selectWorkflow({ ...base, risk: "high", bindings: { ...base.bindings, critic } }, DEFAULT_POLICY);
    expect(d.selected).toBe("critique");
  });

  it("honours forceWorkflow and marks the decision as forced", () => {
    const d = selectWorkflow({ ...base, forceWorkflow: "cascade" }, DEFAULT_POLICY);
    expect(d.selected).toBe("cascade");
    expect(d.forced).toBe(true);
  });

  it("records the inputs behind every decision", () => {
    const d = selectWorkflow(base, DEFAULT_POLICY);
    expect(d.inputs).toMatchObject({ risk: "low", verificationCommands: 0, hasCriticBinding: false });
  });
});
