import type { DryRunPlan, PlannedLeg } from "../schemas/plan.js";
import type { LegState, ProgressEvent, ProgressStream } from "../schemas/progress.js";

export const SCENARIOS = ["nominal", "cancelled", "timed-out", "budget-exhausted"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export interface SimulationOptions {
  scenario: Scenario;
  atLeg?: number;
  workflowId?: string;
}

const EPOCH = Date.UTC(2000, 0, 1, 0, 0, 0);
const STEP_MS = 1000;

export class SimulationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationError";
  }
}

export function simulateProgress(plan: DryRunPlan, options: SimulationOptions): ProgressStream {
  const workflowId = options.workflowId ?? `dry-run:${plan.taskId}`;
  const faultLeg = options.scenario === "nominal" ? -1 : (options.atLeg ?? 0);
  if (faultLeg >= 0 && !plan.legs.some((l) => l.index === faultLeg)) {
    throw new SimulationError(`plan has no leg ${faultLeg}`);
  }

  const events: ProgressEvent[] = [];
  const push = (leg: PlannedLeg, state: LegState, code: string, message: string, evidenceRef?: string) => {
    const sequence = events.length;
    events.push({
      version: 1,
      workflowId,
      legId: `leg-${leg.index}`,
      sequence,
      timestamp: new Date(EPOCH + sequence * STEP_MS).toISOString(),
      state,
      reason: { code, message },
      origin: "dry-run-simulation",
      ...(evidenceRef ? { evidenceRef } : {}),
    });
  };

  for (const leg of plan.legs) push(leg, "planned", "plan-rendered", `leg ${leg.index} (${leg.role}) planned by ${plan.decision.policy}`);

  let aborted = false;
  for (const leg of plan.legs) {
    if (aborted) {
      push(leg, "cancelled", "upstream-terminated", `leg ${leg.index} never started because an earlier leg ended the workflow`);
      continue;
    }
    push(leg, "ready", "gates-satisfied", `runs if: ${leg.runsIf}`);
    push(leg, "running", "simulated-start", `simulated ${leg.invocation.executable} invocation; no process launched`);
    if (leg.index === faultLeg) {
      switch (options.scenario) {
        case "cancelled":
          push(leg, "cancelled", "user-cancel", "simulated cancellation signal; base worktree unchanged");
          break;
        case "timed-out":
          push(leg, "timed-out", "deadline-exceeded", `simulated timeout after ${leg.budget.timeoutSeconds}s; base worktree unchanged`);
          break;
        case "budget-exhausted":
          push(
            leg,
            "budget-exhausted",
            "max-usd-reached",
            leg.budget.maxUsd !== undefined ? `simulated spend reached maxUsd ${leg.budget.maxUsd}` : "simulated budget stop; maxUsd was not set so the limit is hypothetical",
          );
          break;
        case "nominal":
          break;
      }
      aborted = true;
      continue;
    }
    push(leg, "succeeded", "simulated-success", `simulated completion; gates ${leg.gatesAfter.map((g) => g.id).join(", ") || "none"} assumed satisfied`, `plan:${plan.taskId}:leg-${leg.index}`);
  }

  return { version: 1, workflowId, origin: "dry-run-simulation", events };
}
