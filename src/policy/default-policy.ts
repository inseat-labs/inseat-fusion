import type { Policy } from "../schemas/policy.js";

export const DEFAULT_POLICY: Policy = {
  version: 1,
  name: "default-static-v1",
  rules: [
    {
      id: "high-risk-critique",
      description: "High-risk tasks with a configured critic get an independent read-only review and one bounded repair.",
      when: { risk: ["high"], requiresCriticBinding: true },
      select: "critique",
    },
    {
      id: "medium-risk-cascade",
      description: "Medium-risk tasks with an escalation binding and at least one verification command start cheap and escalate on a failed gate.",
      when: { risk: ["medium"], requiresEscalationBinding: true, minVerificationCommands: 1 },
      select: "cascade",
    },
    {
      id: "low-risk-single",
      description: "Low-risk tasks run one solver.",
      when: { risk: ["low"] },
      select: "single",
    },
  ],
  fallback: "single",
};
