import { ProgressStreamSchema, type LegState, type ProgressEvent, type ProgressStream } from "../schemas/progress.js";
import { canTransition, INITIAL_STATE, isTerminal } from "./transitions.js";

export interface StreamViolation {
  code:
    | "schema"
    | "workflow-id-mismatch"
    | "origin-mismatch"
    | "sequence-not-contiguous"
    | "timestamp-not-monotonic"
    | "first-state-not-planned"
    | "invalid-transition"
    | "event-after-terminal";
  sequence: number | null;
  legId: string | null;
  message: string;
}

export type StreamValidation =
  | { ok: true; finalStates: Record<string, LegState>; eventCount: number }
  | { ok: false; violations: StreamViolation[] };

export function validateProgressStream(input: unknown): StreamValidation {
  const parsed = ProgressStreamSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      violations: parsed.error.issues.map((i) => ({
        code: "schema",
        sequence: null,
        legId: null,
        message: `${i.path.join(".") || "<root>"}: ${i.message}`,
      })),
    };
  }
  return validateEvents(parsed.data);
}

function validateEvents(stream: ProgressStream): StreamValidation {
  const violations: StreamViolation[] = [];
  const legState = new Map<string, LegState>();
  let lastTimestamp = -Infinity;

  stream.events.forEach((event, index) => {
    if (event.workflowId !== stream.workflowId) {
      violations.push(v("workflow-id-mismatch", event, `event workflowId "${event.workflowId}" differs from stream "${stream.workflowId}"`));
    }
    if (event.origin !== stream.origin) {
      violations.push(v("origin-mismatch", event, `event origin "${event.origin}" differs from stream origin "${stream.origin}"`));
    }
    if (event.sequence !== index) {
      violations.push(v("sequence-not-contiguous", event, `expected sequence ${index}, got ${event.sequence}`));
    }
    const ts = Date.parse(event.timestamp);
    if (ts < lastTimestamp) {
      violations.push(v("timestamp-not-monotonic", event, `timestamp ${event.timestamp} is earlier than the previous event`));
    }
    lastTimestamp = Math.max(lastTimestamp, ts);

    const current = legState.get(event.legId);
    if (current === undefined) {
      if (event.state !== INITIAL_STATE) {
        violations.push(v("first-state-not-planned", event, `first event for ${event.legId} must be "planned", got "${event.state}"`));
      }
      legState.set(event.legId, event.state);
      return;
    }
    if (isTerminal(current)) {
      violations.push(v("event-after-terminal", event, `${event.legId} already reached terminal state "${current}"`));
      return;
    }
    if (!canTransition(current, event.state)) {
      violations.push(v("invalid-transition", event, `${event.legId}: "${current}" -> "${event.state}" is not allowed`));
      return;
    }
    legState.set(event.legId, event.state);
  });

  if (violations.length > 0) return { ok: false, violations };
  return { ok: true, finalStates: Object.fromEntries(legState), eventCount: stream.events.length };
}

function v(code: StreamViolation["code"], event: ProgressEvent, message: string): StreamViolation {
  return { code, sequence: event.sequence, legId: event.legId, message };
}
