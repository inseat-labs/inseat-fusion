import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildDryRunPlan } from "../src/planner/plan.js";
import { DEFAULT_POLICY } from "../src/policy/default-policy.js";
import { simulateProgress, SimulationError } from "../src/progress/simulate.js";
import { canTransition, isTerminal, TRANSITIONS } from "../src/progress/transitions.js";
import { validateProgressStream } from "../src/progress/validate.js";
import { LegStateSchema, ProgressStreamSchema, TERMINAL_STATES } from "../src/schemas/progress.js";
import { TaskSchema } from "../src/schemas/task.js";

const root = join(import.meta.dirname, "..");
const loadJson = async (rel: string) => JSON.parse(await readFile(join(root, rel), "utf8")) as unknown;
const loadTask = async (file: string) => TaskSchema.parse(await loadJson(join("examples", "tasks", file)));

describe("transition table", () => {
  it("covers every state exactly once and terminal states have no exits", () => {
    expect(Object.keys(TRANSITIONS).sort()).toEqual([...LegStateSchema.options].sort());
    for (const s of TERMINAL_STATES) {
      expect(isTerminal(s)).toBe(true);
      expect(TRANSITIONS[s]).toEqual([]);
    }
  });

  it("rejects skipping ready and re-entering running", () => {
    expect(canTransition("planned", "running")).toBe(false);
    expect(canTransition("running", "running")).toBe(false);
    expect(canTransition("planned", "ready")).toBe(true);
    expect(canTransition("running", "budget-exhausted")).toBe(true);
  });
});

describe("validateProgressStream", () => {
  it("accepts every valid fixture", async () => {
    const dir = join(root, "fixtures", "progress", "valid");
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) {
      const result = validateProgressStream(await loadJson(join("fixtures", "progress", "valid", f)));
      expect(result.ok, f).toBe(true);
    }
  });

  it.each([
    ["duplicate-sequence.json", "sequence-not-contiguous"],
    ["out-of-order-sequence.json", "sequence-not-contiguous"],
    ["planned-to-running.json", "invalid-transition"],
    ["event-after-terminal.json", "event-after-terminal"],
    ["first-state-not-planned.json", "first-state-not-planned"],
    ["timestamp-regresses.json", "timestamp-not-monotonic"],
    ["workflow-id-mismatch.json", "workflow-id-mismatch"],
    ["origin-mismatch.json", "origin-mismatch"],
    ["malformed-schema.json", "schema"],
  ])("rejects %s with %s", async (file, code) => {
    const result = validateProgressStream(await loadJson(join("fixtures", "progress", "invalid", file)));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.violations.map((v) => v.code)).toContain(code);
  });

  it("reports final states per leg", async () => {
    const result = validateProgressStream(await loadJson("fixtures/progress/valid/timed-out-at-critic.json"));
    expect(result.ok && result.finalStates).toEqual({ "leg-0": "succeeded", "leg-1": "timed-out", "leg-2": "cancelled" });
  });
});

describe("simulateProgress", () => {
  it("is deterministic and always labeled dry-run-simulation", async () => {
    const plan = buildDryRunPlan(await loadTask("medium-risk-cascade.json"), DEFAULT_POLICY);
    const a = simulateProgress(plan, { scenario: "cancelled", atLeg: 0 });
    const b = simulateProgress(plan, { scenario: "cancelled", atLeg: 0 });
    expect(a).toEqual(b);
    expect(a.origin).toBe("dry-run-simulation");
    expect(a.events.every((e) => e.origin === "dry-run-simulation")).toBe(true);
    expect(ProgressStreamSchema.parse(a)).toBeTruthy();
  });

  it("matches the committed fixtures byte-for-byte in content", async () => {
    const cases: [string, string, Parameters<typeof simulateProgress>[1]][] = [
      ["medium-risk-cascade.json", "cancelled-at-leg-0.json", { scenario: "cancelled", atLeg: 0 }],
      ["high-risk-critique.json", "timed-out-at-critic.json", { scenario: "timed-out", atLeg: 1 }],
      ["low-risk-single.json", "budget-exhausted-at-leg-0.json", { scenario: "budget-exhausted", atLeg: 0 }],
      ["high-risk-critique.json", "nominal-critique.json", { scenario: "nominal" }],
    ];
    for (const [task, fixture, opts] of cases) {
      const plan = buildDryRunPlan(await loadTask(task), DEFAULT_POLICY);
      expect(simulateProgress(plan, opts), fixture).toEqual(await loadJson(`fixtures/progress/valid/${fixture}`));
    }
  });

  it("cancellation at a leg leaves downstream legs cancelled without running", async () => {
    const plan = buildDryRunPlan(await loadTask("high-risk-critique.json"), DEFAULT_POLICY);
    const stream = simulateProgress(plan, { scenario: "cancelled", atLeg: 0 });
    const leg2 = stream.events.filter((e) => e.legId === "leg-2").map((e) => e.state);
    expect(leg2).toEqual(["planned", "cancelled"]);
    expect(validateProgressStream(stream).ok).toBe(true);
  });

  it("every simulated stream validates", async () => {
    for (const task of ["low-risk-single.json", "medium-risk-cascade.json", "high-risk-critique.json"]) {
      const plan = buildDryRunPlan(await loadTask(task), DEFAULT_POLICY);
      for (const scenario of ["nominal", "cancelled", "timed-out", "budget-exhausted"] as const) {
        for (const leg of plan.legs) {
          const stream = simulateProgress(plan, { scenario, atLeg: leg.index });
          expect(validateProgressStream(stream).ok, `${task} ${scenario} @${leg.index}`).toBe(true);
        }
      }
    }
  });

  it("rejects a fault at a leg the plan does not have", async () => {
    const plan = buildDryRunPlan(await loadTask("low-risk-single.json"), DEFAULT_POLICY);
    expect(() => simulateProgress(plan, { scenario: "timed-out", atLeg: 7 })).toThrow(SimulationError);
  });
});

describe("dry-run plan progress model", () => {
  it("embeds the state specification, not telemetry", async () => {
    const plan = buildDryRunPlan(await loadTask("low-risk-single.json"), DEFAULT_POLICY);
    expect(plan.progressModel.kind).toBe("specification");
    expect(plan.progressModel.states).toEqual([...LegStateSchema.options]);
    expect(plan.progressModel.transitions["running"]).toContain("timed-out");
  });
});
