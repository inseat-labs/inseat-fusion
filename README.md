# Inseat Fusion

Inseat Fusion is a planned, independent open-source controller for coding
workflows that run through documented noninteractive CLI interfaces.

> Status: planning only. This repository is not usable yet. It contains no CLI,
> package, runtime, adapters, or executable examples.

The product hypothesis is that a transparent policy can choose among Single,
Cascade, Critique with one bounded repair, and later Parallel candidate
workflows based on task risk and explicit budgets. Each workflow leg would show
its model, role, cost, latency, outcome, and evidence. Deterministic gates would
select a candidate before one final patch is applied atomically.

## Important overlap and uncertainty

This idea overlaps materially with GitHub Project HydraFusion, Quorum, MassGen,
and general coding-agent orchestrators. Its proposed differentiation is narrower:
adaptive workflow policy, transparent per-leg provenance/cost/latency,
deterministic acceptance gates, and atomic final patch application. That
differentiation is a hypothesis, not a validated advantage. The project must
stop or change direction if evaluation does not show a useful gain over a fixed
model or Quorum.

Inseat Fusion is inspired by public ideas described for GitHub Project
HydraFusion. GitHub currently documents HydraFusion only as an experimental
Copilot CLI feature; constituent model selection and intermediate passes are not
exposed to users. Inseat Fusion is not affiliated with or endorsed by GitHub, is
not a clone or reverse engineering effort, and does not use GitHub internals. It
is also distinct from Inseat Switch, which is planned as a model-migration
compatibility checker rather than a workflow controller.

## Planned workflows

- **Single:** one solver produces a candidate.
- **Cascade:** an initial solver runs first; a deterministic gate either accepts
  the candidate or escalates to a stronger configured solver.
- **Critique and one repair:** a read-only critic reviews a candidate, then the
  solver receives one bounded repair opportunity.
- **Parallel, later:** isolated solvers produce candidates from the same
  immutable base, then a verifier and evidence judge select one. Parallel is our
  proposed later strategy. GitHub does not report it as a current HydraFusion
  pattern.

The controller would never automatically combine candidate patches through
unsafe textual merging. It would select one candidate, optionally permit one
bounded repair, verify it, and apply one final patch.

## MVP boundary

The first implementation milestone is deliberately small:

- static workflow policies and dry-run planning
- Claude Code and Codex adapter contracts with fixtures
- explicit budgets, timeouts, cancellation, and progress events
- planned verification and provenance event schemas
- malformed-output, cancellation, and schema-drift fixtures
- no process execution or repository mutation
- no learned router and no Parallel execution in the initial MVP

Isolated solver worktrees and atomic patch application belong to Milestone 1.
Read-only critics and bounded repair belong to Milestone 2.

Users would bring their own API keys or CLI credentials. Inseat Fusion would not
resell credentials, proxy access, or conceal provider usage.

## Documents

- [ARCHITECTURE.md](ARCHITECTURE.md): planned components, invariants, and flow
- [ROADMAP.md](ROADMAP.md): milestones and acceptance criteria
- [docs/PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md): audience, value hypothesis, and boundaries
- [docs/RESEARCH.md](docs/RESEARCH.md): verified sources, claims, and open questions
- [docs/COMPETITORS.md](docs/COMPETITORS.md): overlap and differentiation risks
- [docs/EVALUATION_PLAN.md](docs/EVALUATION_PLAN.md): preregistered comparison plan
- [docs/THREAT_MODEL.md](docs/THREAT_MODEL.md): assets, threats, and mitigations
- [docs/HANDOFF.md](docs/HANDOFF.md): exact next implementation order
- [examples/README.md](examples/README.md): planned, non-executable scenarios

## License

The repository is licensed under Apache License 2.0. See [LICENSE](LICENSE).
