import { TERMINAL_STATES, type LegState } from "../schemas/progress.js";

export const TRANSITIONS: Readonly<Record<LegState, readonly LegState[]>> = {
  planned: ["ready", "cancelled"],
  ready: ["running", "cancelled"],
  running: ["succeeded", "failed", "timed-out", "cancelled", "budget-exhausted", "malformed-output", "schema-drift"],
  succeeded: [],
  failed: [],
  "timed-out": [],
  cancelled: [],
  "budget-exhausted": [],
  "malformed-output": [],
  "schema-drift": [],
};

export const INITIAL_STATE: LegState = "planned";

export function isTerminal(state: LegState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function canTransition(from: LegState, to: LegState): boolean {
  return TRANSITIONS[from].includes(to);
}
