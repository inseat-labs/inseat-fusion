export const INVARIANTS: readonly string[] = [
  "Solvers operate in isolated worktrees created from one immutable base revision.",
  "Critics are read-only and never receive write permissions.",
  "Failure, cancellation, or timeout leaves the base worktree unchanged.",
  "One candidate is selected; candidate patches are never textually merged.",
  "At most one policy-bounded repair precedes complete re-verification.",
  "Missing cost or usage evidence is reported as unavailable, never estimated silently.",
  "Users supply their own CLI credentials; nothing is proxied or resold.",
  "Dry-run mode launches no provider process and mutates no repository.",
];
