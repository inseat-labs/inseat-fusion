import { getAdapter } from "../adapters/index.js";
import { selectWorkflow } from "../policy/select.js";
import type { Budget, ModelBinding } from "../schemas/common.js";
import type { DryRunPlan, PlannedLeg } from "../schemas/plan.js";
import type { Policy } from "../schemas/policy.js";
import type { Task } from "../schemas/task.js";
import { INVARIANTS } from "./invariants.js";
import { TRANSITIONS } from "../progress/transitions.js";
import { LegStateSchema, TERMINAL_STATES } from "../schemas/progress.js";

export class PlanError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlanError";
  }
}

const GATE_VERIFY = { id: "verify", description: "All required verification commands pass in the candidate worktree.", deterministic: true as const };
const GATE_SCOPE = { id: "patch-scope", description: "Changed files stay within task.touchesPaths when it is non-empty.", deterministic: true as const };
const GATE_BASE = { id: "base-unchanged", description: "Base revision is unchanged before atomic application.", deterministic: true as const };
const GATE_CRITIC_OUTPUT = { id: "critic-output-valid", description: "Critic output parses; invalid output fails closed.", deterministic: true as const };

export function buildDryRunPlan(task: Task, policy: Policy): DryRunPlan {
  const decision = selectWorkflow(task, policy);
  const legs = legsFor(task, decision.selected);
  return {
    version: 1,
    mode: "dry-run",
    taskId: task.id,
    baseRevision: task.repository.baseRevision,
    workflow: decision.selected,
    decision,
    legs,
    maxRepairs: decision.selected === "critique" ? 1 : 0,
    finalGates: [GATE_VERIFY, GATE_SCOPE, GATE_BASE],
    progressModel: {
      kind: "specification",
      note: "Allowed leg states and transitions. This is the contract a future runtime must emit; it is not telemetry from any execution.",
      states: [...LegStateSchema.options],
      terminalStates: [...TERMINAL_STATES],
      transitions: Object.fromEntries(Object.entries(TRANSITIONS).map(([k, v]) => [k, [...v]])),
    },
    estimatedCost:
      task.budget.maxUsd !== undefined
        ? { status: "bounded", maxUsd: task.budget.maxUsd }
        : { status: "unavailable", reason: "task.budget.maxUsd not set; per-leg pricing is not estimated" },
    invariants: [...INVARIANTS],
  };
}

function legsFor(task: Task, workflow: DryRunPlan["workflow"]): PlannedLeg[] {
  const { primary, escalation, critic } = task.bindings;
  switch (workflow) {
    case "single":
      return [solverLeg(task, 0, "solver", primary, "always")];
    case "cascade":
      if (!escalation) throw new PlanError("cascade requires bindings.escalation");
      return [
        solverLeg(task, 0, "solver", primary, "always"),
        solverLeg(task, 1, "escalation-solver", escalation, "leg 0 fails gate verify or patch-scope"),
      ];
    case "critique":
      if (!critic) throw new PlanError("critique requires bindings.critic");
      return [
        solverLeg(task, 0, "solver", primary, "always"),
        criticLeg(task, 1, critic),
        solverLeg(task, 2, "repair-solver", primary, "leg 1 reports at least one blocking finding"),
      ];
  }
}

function solverLeg(task: Task, index: number, role: PlannedLeg["role"], binding: ModelBinding, runsIf: string): PlannedLeg {
  const budget = legBudget(task.budget);
  return {
    index,
    role,
    binding,
    readOnly: false,
    worktree: "isolated-solver",
    budget,
    invocation: getAdapter(binding.adapter).planInvocation({
      binding,
      instruction: task.instruction,
      cwd: `<isolated worktree of ${task.repository.baseRevision}>`,
      readOnly: false,
      timeoutSeconds: budget.timeoutSeconds,
      ...(budget.maxUsd !== undefined ? { maxUsd: budget.maxUsd } : {}),
    }),
    gatesAfter: [GATE_VERIFY, GATE_SCOPE],
    runsIf,
  };
}

function criticLeg(task: Task, index: number, binding: ModelBinding): PlannedLeg {
  const budget = legBudget(task.budget);
  return {
    index,
    role: "critic",
    binding,
    readOnly: true,
    worktree: "none",
    budget,
    invocation: getAdapter(binding.adapter).planInvocation({
      binding,
      instruction: `Review the candidate diff for task "${task.title}". Report blocking findings only. Do not edit files.`,
      cwd: "<read-only view of leg 0 candidate>",
      readOnly: true,
      timeoutSeconds: budget.timeoutSeconds,
    }),
    gatesAfter: [GATE_CRITIC_OUTPUT],
    runsIf: "leg 0 passes gate verify",
  };
}

function legBudget(budget: Budget): Budget {
  return { ...budget };
}
