# Boundary lineage integrity (design, not implemented)

Status: design only. Nothing in `src/` implements this document. Fusion has no
execution engine, so there is no live lineage to record. Implementation is
scheduled for Milestones 1 and 2 in [ROADMAP.md](../ROADMAP.md). This document
exists so the runtime is built to emit the right evidence from its first
commit rather than retrofitted.

## Problem

A Fusion workflow moves artifacts across trust boundaries: the immutable base
into a solver worktree, a solver's diff into a read-only critic, critic
findings back into a repair solver, one selected patch into the atomic
applicator. Every crossing is a place where an artifact can be dropped,
substituted, reordered, duplicated, or attributed to the wrong leg. The ledger
records outcomes per leg. It does not currently prove that what leg N consumed
is what leg N-1 produced.

## Boundary envelope (future schema, `version: 1`)

One envelope is emitted each time an artifact crosses a leg boundary.

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | `1` | Schema version. |
| `workflowId` | string | Same value as the ledger and progress stream. |
| `envelopeId` | string | Unique per envelope; digest of the canonical envelope body without this field. |
| `parentLegId` | `leg-<n>` or `"base"` | Producer of the input. `"base"` for the immutable base revision. |
| `currentLegId` | `leg-<n>` or `"applicator"` | Consumer. |
| `adapter` | `claude-code` or `codex` | From the current leg's binding. |
| `model` | string or null | From the result envelope; null if the CLI did not report it. |
| `role` | leg role | From the plan. |
| `transformation` | enum | `solve`, `critique`, `repair`, `select`, `verify`, `apply`. |
| `inputManifest` | `ArtifactRef[]` | What the current leg was given. |
| `artifactManifest` | `ArtifactRef[]` | What the current leg produced. |
| `selectedOutputs` | `ArtifactRef[]` | Subset of `artifactManifest` carried forward. Empty for critics. |
| `verifierEvidenceIds` | string[] | IDs of deterministic verification results applied to `selectedOutputs`. |
| `sequence` | integer | Contiguous from 0 within the workflow, shared counter with progress events. |
| `timestamp` | ISO 8601 | Monotonic non-decreasing across the workflow. |
| `origin` | `runtime` | Boundary envelopes are never simulated. There is no `dry-run-simulation` origin for lineage. |

An `ArtifactRef` is `{ id, kind, digest, redaction }` where `kind` is one of
`base-tree`, `patch`, `diff-summary`, `finding-set`, `verification-report`,
`instruction`; `digest` is `sha256:<hex>` over the canonical redacted bytes;
and `redaction` is `none`, `paths-only`, or `digest-only`.

## Digest continuity

For every envelope E with `currentLegId = L`:

1. Every `inputManifest` entry of E must appear, with identical `digest`, in
   the `selectedOutputs` of the envelope whose `currentLegId = E.parentLegId`,
   or be the base tree digest when `parentLegId = "base"`.
2. Every `selectedOutputs` entry must appear in E's own `artifactManifest`.
3. The `envelopeId` must equal the recomputed digest of E's canonical body.
4. A patch that reaches the applicator must have an unbroken chain of
   envelopes from `"base"` with no missing sequence numbers.

Any violation is a hard failure. The applicator refuses to apply.

## Parentage validation

- A leg may have exactly one parent envelope per input artifact.
- A critic's `selectedOutputs` must be empty; its `artifactManifest` contains
  only `finding-set` artifacts.
- A repair leg's `inputManifest` must contain exactly one `patch` from the
  solver it repairs and at least one `finding-set` from a critic.
- `select` transformations may have several parents (candidates) but exactly
  one entry in `selectedOutputs`.
- `role`, `adapter`, and `model` must match the plan's leg and the result
  envelope for `currentLegId`. Mismatch is misattribution and fails closed.

## Fail-closed behavior

Missing envelope, unverifiable digest, unknown parent, duplicate `sequence`,
regressing `timestamp`, or a `selectedOutputs` entry with no matching
verification evidence all produce the same result: the workflow ends in
`failed` with reason code `lineage-broken`, the base worktree is untouched, and
the ledger records which check failed. There is no "best effort" mode.

## Redaction boundaries

- Digests are computed over redacted canonical content, so a redacted artifact
  still has a stable identity.
- `instruction` artifacts default to `digest-only`. Raw prompts are never
  stored in envelopes.
- `patch` artifacts default to `paths-only` in the envelope; the bytes live in
  the worktree and are referenced by digest.
- Redaction level is recorded per artifact so a reader knows what the digest
  covers. Changing the level changes the digest and breaks continuity by
  design.
- Secret scanning of artifact bytes before digesting is a Milestone 1 gate,
  reusing the ledger's key-name redaction as a floor, not a ceiling.

## Replay expectations

Given the base revision, the plan, all envelopes, and the worktree artifacts,
a verifier must be able to recompute every digest and re-check continuity
offline without provider access. Replay does not re-run models. It confirms
that the artifacts on disk are the artifacts the ledger claims were selected.

## Relationship to the current ledger

The ledger stays the summary record: decision, legs, outcomes, usage, applied.
Boundary envelopes are the detail record that justifies `selectedLeg` and
`applied: true`. The ledger will gain `lineage: { envelopeCount, rootDigest,
verified: boolean }`. The progress stream and envelopes share the `sequence`
counter so an auditor can interleave them into one timeline.

## Optional future OpenTelemetry export

Each envelope could map to one span: `workflowId` as trace id, `envelopeId` as
span id, `parentLegId` envelope as parent span, fields as attributes, digests
as attributes, never artifact bytes. This is an export adapter only and is not
planned before Milestone 2 has evidence that anyone wants it.

## Explicit non-goals

Fusion will not build a collector, a storage backend, a tracing dashboard, or a
hosted lineage service. Envelopes are local JSON files next to the ledger.

## Threat scenarios

| Scenario | Example | Detected by |
| --- | --- | --- |
| Dropped artifact | Critic findings never reach the repair leg | Repair envelope `inputManifest` lacks a `finding-set`; parentage rule fails |
| Substituted artifact | Applicator receives a patch from a different worktree | Digest in applicator `inputManifest` not present in selected leg's `selectedOutputs` |
| Reordered artifacts | Repair output presented as the pre-critique candidate | `sequence` and parent chain contradict; `transformation` mismatch |
| Duplicated artifact | Same patch counted as two candidates in `select` | Identical digests across parents; select rule requires distinct candidates |
| Misattributed artifact | Codex output labeled as the Claude Code solver's | `adapter`/`model` in envelope disagree with result envelope for `currentLegId` |
| Truncated chain | Envelopes after a crash omit the final `apply` | `applied: true` in ledger without an `apply` envelope; replay fails |
| Tampered envelope | Field edited after the fact | `envelopeId` digest mismatch |
