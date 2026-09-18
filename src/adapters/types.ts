import type { AdapterCapabilities, InvocationPlan, ResultEnvelope } from "../schemas/adapter.js";
import type { ModelBinding } from "../schemas/common.js";

export interface InvocationRequest {
  binding: ModelBinding;
  instruction: string;
  cwd: string;
  readOnly: boolean;
  timeoutSeconds: number;
}

export interface Adapter {
  readonly capabilities: AdapterCapabilities;
  planInvocation(request: InvocationRequest): InvocationPlan;
  parseOutput(raw: string, exitCode: number | null): ResultEnvelope;
}
