import type { Policy, PolicyDecision, PolicyRule } from "../schemas/policy.js";
import type { Task } from "../schemas/task.js";

export function selectWorkflow(task: Task, policy: Policy): PolicyDecision {
  const inputs = {
    risk: task.risk,
    verificationCommands: task.verification.length,
    hasCriticBinding: task.bindings.critic !== undefined,
    hasEscalationBinding: task.bindings.escalation !== undefined,
    maxUsd: task.budget.maxUsd ?? null,
    forceWorkflow: task.forceWorkflow ?? null,
  };

  if (task.forceWorkflow) {
    return {
      policy: policy.name,
      selected: task.forceWorkflow,
      ruleId: null,
      forced: true,
      inputs,
      explanation: `task.forceWorkflow=${task.forceWorkflow} overrides policy "${policy.name}"`,
    };
  }

  for (const rule of policy.rules) {
    if (matches(rule, task)) {
      return {
        policy: policy.name,
        selected: rule.select,
        ruleId: rule.id,
        forced: false,
        inputs,
        explanation: `rule "${rule.id}" matched: ${rule.description}`,
      };
    }
  }

  return {
    policy: policy.name,
    selected: policy.fallback,
    ruleId: null,
    forced: false,
    inputs,
    explanation: `no rule matched; policy fallback "${policy.fallback}" applied`,
  };
}

function matches(rule: PolicyRule, task: Task): boolean {
  const w = rule.when;
  if (w.risk && !w.risk.includes(task.risk)) return false;
  if (w.minVerificationCommands !== undefined && task.verification.length < w.minVerificationCommands) return false;
  if (w.requiresCriticBinding && !task.bindings.critic) return false;
  if (w.requiresEscalationBinding && !task.bindings.escalation) return false;
  if (w.minBudgetUsd !== undefined && (task.budget.maxUsd === undefined || task.budget.maxUsd < w.minBudgetUsd)) return false;
  return true;
}
