import type { DryRunPlan } from "../schemas/plan.js";

export function renderPlan(plan: DryRunPlan): string {
  const out: string[] = [];
  out.push(`DRY RUN  task=${plan.taskId}  base=${plan.baseRevision}`);
  out.push(`workflow: ${plan.workflow.toUpperCase()}  (${plan.decision.explanation})`);
  out.push(`max repairs: ${plan.maxRepairs}`);
  const cost = plan.estimatedCost;
  out.push(`cost: ${cost.status === "bounded" ? `bounded at $${cost.maxUsd.toFixed(2)}` : `unavailable (${cost.reason})`}`);
  out.push("");
  for (const leg of plan.legs) {
    out.push(`leg ${leg.index}  ${leg.role}  ${leg.binding.adapter}:${leg.binding.model}  ${leg.readOnly ? "read-only" : "read-write"}  worktree=${leg.worktree}`);
    out.push(`       runs if: ${leg.runsIf}`);
    out.push(`       timeout: ${leg.budget.timeoutSeconds}s`);
    out.push(`       command: ${leg.invocation.executable} ${leg.invocation.args.map(quote).join(" ")}`);
    out.push(`       gates:   ${leg.gatesAfter.map((g) => g.id).join(", ") || "none"}`);
  }
  out.push("");
  out.push(`final gates: ${plan.finalGates.map((g) => g.id).join(", ")}`);
  out.push("no process was launched and no repository was modified.");
  return out.join("\n");
}

function quote(arg: string): string {
  return /[\s"']/.test(arg) ? JSON.stringify(arg.length > 60 ? arg.slice(0, 57) + "..." : arg) : arg;
}
