# Implementation Handoff

The repository is planning-only. Do not add runtime code until the milestone
boundary and threat model are reviewed.

## Exact next implementation order

1. Revalidate every external source in RESEARCH.md and COMPETITORS.md, recording
   review date, current CLI versions, changed URLs, and changed claims.
2. Audit current Quorum and MassGen revisions and freeze the comparison contract
   used by EVALUATION_PLAN.md.
3. Freeze Milestone 0 scope: static policies, dry-run only, adapter contracts,
   fixtures, progress events, budgets, and ledger schemas. Exclude live process
   execution, learned routing, Parallel candidates, and repository mutation.
4. Define versioned task, policy, adapter capability, invocation plan, event,
   result, verification evidence, budget, and ledger schemas.
5. Create Claude Code contract fixtures from the currently documented
   programmatic interface, including success, malformed output, timeout,
   cancellation, missing usage, and schema drift.
6. Create Codex contract fixtures from the currently documented noninteractive
   interface with the same outcome classes.
7. Implement schema validation and adapter parity tests before adapter logic.
8. Implement static policy selection for Single, Cascade, and Critique and emit
   the exact rule and inputs behind every decision.
9. Implement dry-run planning with user-visible legs, roles, limits, gates,
   progress states, and provenance. Do not launch child processes.
10. Implement ledger serialization with secret exclusion and unavailable-value
    semantics; validate deterministic fixture output.
11. Add fault fixtures for malformed events, output truncation, budget exhaustion,
    timeout, and cancellation state transitions.
12. Run the complete test suite and repository build once a real toolchain exists,
    and publish the Milestone 0 evidence before considering Milestone 1.

## Required revalidation before Milestone 1

- Re-read Claude Code programmatic, agent teams, and sub-agent documentation.
- Re-read Codex CLI and noninteractive documentation and inspect the current OSS
  release behavior.
- Re-read the GitHub HydraFusion article and community discussion; keep Parallel
  labeled as this project's later proposal unless GitHub's public claim changes.
- Re-read the HyDRA preprint and avoid treating a preprint as product validation.
- Re-audit Quorum, MassGen, Aider architect mode, Cline, OpenHands, and SWE-agent.
- Freeze immutable source snapshots or citations used by evaluation records.

## Non-negotiable implementation constraints

Solvers use isolated worktrees from an immutable base. Critics remain read-only.
There is no unsafe automatic textual merge. Selection precedes at most one
bounded repair and complete re-verification. Cancellation leaves the base
unchanged. Users provide their own credentials; no credential resale or proxy is
part of the product.
