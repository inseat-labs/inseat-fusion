# Evaluation Plan

This plan must be preregistered with frozen task sets, policies, budgets, models,
versions, and analysis rules before outcome runs begin.

## Questions

1. Does adaptive static policy improve verified quality at an acceptable cost
   and latency relative to a fixed-model baseline?
2. Does it outperform or complement a fair Quorum configuration?
3. Are Claude Code and Codex adapters behaviorally comparable where their
   documented interfaces overlap?
4. Do deterministic gates, isolation, and cancellation preserve repository
   integrity under faults?

## Design

- Choose public or redistributable repositories pinned to immutable revisions.
- Separate policy-development tasks from held-out outcome tasks.
- Stratify tasks by language, size, risk, and expected verification strength.
- Freeze one fixed-model baseline and equivalent budgets for all comparisons.
- Record provider, model, CLI version, reasoning setting, policy, prompts,
  allowed tools, timeouts, retries, pricing timestamp, and missing results.
- Run enough repeated trials to expose nondeterminism; publish uncertainty and
  exclusions rather than selecting favorable runs.

## Measures

- **Quality:** task-specific deterministic checks plus blinded human review where
  deterministic checks are insufficient.
- **Cost:** complete observed usage for every solver, critic, repair, escalation,
  retry, and fallback, with unavailable evidence labeled unavailable.
- **Latency:** end-to-end wall time and per-leg active and waiting time.
- **Reliability:** completion, schema validity, timeout, cancellation, and cleanup.
- **Atomicity:** whether the base remains byte-for-byte unchanged before a valid
  final application and after every injected failure.
- **Transparency:** completeness and accuracy of the provenance ledger.

## Required studies

### Adapter parity

Run equivalent fixtures through both adapters and compare task delivery, working
directory, tool restrictions, structured events, cancellation, exit mapping,
usage evidence, and output schema drift. Document non-equivalent capabilities.

### Fault injection and cancellation atomicity

Inject child crashes, malformed events, output truncation, timeout, budget
exhaustion, verifier failure, base drift, application interruption, cleanup
failure, symlink substitution, and user cancellation at every workflow state.

### Judge bias and ablations

Blind candidate identity and order where possible. Measure self-preference,
provider-family preference, verbosity preference, and order effects. Compare the
full policy with no judge, no critic, no repair, deterministic-only selection,
random valid selection, and fixed workflows.

### Quorum comparison

Freeze a current Quorum revision and document its supported workflows. Match
tasks, models, tools, budgets, verification, and repetitions as closely as its
interfaces permit. Report irreducible differences rather than claiming parity.

## Stop criteria

Stop or materially narrow development if held-out results show no reproducible
benefit over the fixed-model baseline or Quorum, if gains disappear under equal
complete cost accounting, if adapter differences invalidate the comparison, or
if cancellation and atomicity cannot be made reliable against the threat model.

No GitHub benchmark result is a project baseline. GitHub's published numbers are
controlled offline best-tuned results under its own stated conditions.
