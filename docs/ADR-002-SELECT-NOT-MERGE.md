# ADR-002: Select Candidates, Do Not Automatically Merge Them

- Status: accepted for planning
- Date: 2026-09-16

## Context

Multiple solver candidates may touch the same code with incompatible assumptions.
An automatic textual merge can create a result no solver proposed or verified,
hide semantic conflicts, and expand the attack surface. Model-authored conflict
resolution would add another unbounded editing leg.

## Decision

Every multi-candidate workflow must select one candidate from isolated worktrees
after mandatory deterministic checks. An evidence judge may rank candidates but
cannot edit them. The policy may return specific evidence to the selected solver
for one bounded repair. The entire repaired candidate is then reverified before
one atomic final patch is applied.

## Consequences

- Candidate provenance remains coherent and auditable.
- Useful changes split across candidates may be discarded.
- Parallel workflows must justify their extra cost despite selecting only one.
- Ambiguous selection, invalid judge output, or failed verification produces no
  base mutation.
