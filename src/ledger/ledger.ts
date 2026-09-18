import { randomUUID } from "node:crypto";
import type { Ledger } from "../schemas/ledger.js";
import type { DryRunPlan } from "../schemas/plan.js";

const SECRET_KEY_PATTERN = /(api[_-]?key|token|secret|password|authorization|cookie)/i;

export function ledgerFromDryRun(plan: DryRunPlan, now = new Date(), id = randomUUID()): Ledger {
  return {
    version: 1,
    workflowId: id,
    taskId: plan.taskId,
    mode: "dry-run",
    baseRevision: plan.baseRevision,
    decision: plan.decision,
    workflow: plan.workflow,
    legs: plan.legs.map((leg) => ({
      index: leg.index,
      role: leg.role,
      binding: leg.binding,
      startedAt: null,
      endedAt: null,
      outcome: "not-run",
      usage: { status: "unavailable", reason: "dry-run: leg not executed" },
      verificationPassed: null,
    })),
    repairsUsed: 0,
    selectedLeg: null,
    applied: false,
    createdAt: now.toISOString(),
  };
}

export function serializeLedger(ledger: Ledger): string {
  return JSON.stringify(ledger, redactSecrets, 2);
}

function redactSecrets(this: unknown, key: string, value: unknown): unknown {
  if (key && SECRET_KEY_PATTERN.test(key)) return "[redacted]";
  return value;
}
