import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ledgerFromDryRun, serializeLedger } from "../src/ledger/ledger.js";
import { buildDryRunPlan, PlanError } from "../src/planner/plan.js";
import { renderPlan } from "../src/planner/render.js";
import { DEFAULT_POLICY } from "../src/policy/default-policy.js";
import { LedgerSchema } from "../src/schemas/ledger.js";
import { DryRunPlanSchema } from "../src/schemas/plan.js";
import { TaskSchema, type Task } from "../src/schemas/task.js";

const dir = join(import.meta.dirname, "..", "examples", "tasks");
const loadTask = async (file: string): Promise<Task> => TaskSchema.parse(JSON.parse(await readFile(join(dir, file), "utf8")));

describe("buildDryRunPlan", () => {
  it("produces schema-valid plans for every example task", async () => {
    const files = (await readdir(dir)).filter((f) => f.endsWith(".json"));
    expect(files.length).toBe(3);
    for (const f of files) {
      const plan = buildDryRunPlan(await loadTask(f), DEFAULT_POLICY);
      expect(DryRunPlanSchema.parse(plan)).toBeTruthy();
      expect(plan.mode).toBe("dry-run");
    }
  });

  it("critique has a read-only critic and at most one repair", async () => {
    const plan = buildDryRunPlan(await loadTask("high-risk-critique.json"), DEFAULT_POLICY);
    expect(plan.workflow).toBe("critique");
    const critic = plan.legs.find((l) => l.role === "critic");
    expect(critic?.readOnly).toBe(true);
    expect(critic?.worktree).toBe("none");
    expect(critic?.invocation.readOnly).toBe(true);
    expect(plan.maxRepairs).toBe(1);
    expect(plan.legs.filter((l) => l.role === "repair-solver")).toHaveLength(1);
  });

  it("reports cost as unavailable when maxUsd is not set", async () => {
    const plan = buildDryRunPlan(await loadTask("high-risk-critique.json"), DEFAULT_POLICY);
    expect(plan.estimatedCost.status).toBe("unavailable");
  });

  it("all solver legs use isolated worktrees", async () => {
    const plan = buildDryRunPlan(await loadTask("medium-risk-cascade.json"), DEFAULT_POLICY);
    for (const leg of plan.legs.filter((l) => l.role !== "critic")) expect(leg.worktree).toBe("isolated-solver");
  });

  it("is deterministic for the same input", async () => {
    const task = await loadTask("low-risk-single.json");
    expect(buildDryRunPlan(task, DEFAULT_POLICY)).toEqual(buildDryRunPlan(task, DEFAULT_POLICY));
  });

  it("rejects a forced cascade without an escalation binding", async () => {
    const task = { ...(await loadTask("low-risk-single.json")), forceWorkflow: "cascade" as const };
    expect(() => buildDryRunPlan(task, DEFAULT_POLICY)).toThrow(PlanError);
  });

  it("renders text that states no process ran", async () => {
    const text = renderPlan(buildDryRunPlan(await loadTask("low-risk-single.json"), DEFAULT_POLICY));
    expect(text).toContain("SINGLE");
    expect(text).toContain("no process was launched");
  });
});

describe("ledger", () => {
  it("serializes a schema-valid dry-run ledger with legs not-run", async () => {
    const plan = buildDryRunPlan(await loadTask("medium-risk-cascade.json"), DEFAULT_POLICY);
    const ledger = ledgerFromDryRun(plan, new Date(0), "wf-test");
    expect(LedgerSchema.parse(ledger)).toBeTruthy();
    expect(ledger.applied).toBe(false);
    expect(ledger.legs.every((l) => l.outcome === "not-run")).toBe(true);
  });

  it("redacts secret-looking keys during serialization", async () => {
    const plan = buildDryRunPlan(await loadTask("low-risk-single.json"), DEFAULT_POLICY);
    const ledger = ledgerFromDryRun(plan, new Date(0), "wf-test") as Record<string, unknown>;
    ledger["apiKey"] = "sk-live-123";
    const text = serializeLedger(ledger as never);
    expect(text).not.toContain("sk-live-123");
    expect(text).toContain("[redacted]");
  });
});
