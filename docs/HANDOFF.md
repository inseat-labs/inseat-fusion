# Implementation Handoff

## Current state

Milestone 0 has a working starter. From a clean checkout, `npm ci`, `npm test`,
`npm run build`, and `npm run plan:examples` pass (Node 24, verified 2026-09-18).

Implemented:

- Zod schemas (`src/schemas`): task, policy and decision, adapter capabilities,
  invocation plan, result envelope, dry-run plan, ledger. All carry `version: 1`.
- Static policy engine with `DEFAULT_POLICY` (high risk + critic -> critique;
  medium risk + escalation + verification -> cascade; low risk -> single;
  fallback single). Every decision records its rule id and inputs.
- Adapters for Claude Code (`claude -p --output-format json`) and Codex
  (`codex exec --json`): capability declaration, invocation planning with a
  read-only mode for critics, and output parsing that classifies `succeeded`,
  `failed`, `malformed-output`, and `schema-drift`, with usage marked
  `unavailable` when absent. Fixtures live in `fixtures/adapters/`.
- Dry-run planner producing legs, budgets, gates, `runsIf` conditions, invariants,
  and bounded-or-unavailable cost. Text and JSON renderers.
- Ledger built from a dry-run plan with legs `not-run`; serializer redacts
  values whose key matches api key, token, secret, password, authorization, or
  cookie.
- CLI `inseat-fusion plan`, 33 tests, GitHub Actions CI on Node 22 and 24.

Not implemented: progress-event schema, process supervisor, worktree isolation,
verifier, evidence judge, repair loop, atomic applicator, any live execution.

## Decisions taken (2026-09-18)

- Single npm package, ESM, TypeScript 5, Zod 4. No workspace split yet.
- Adapter output parsing is written against the CLI shapes documented on
  2026-09-16 and encoded as fixtures. These are contracts to revalidate, not
  recordings of real sessions.
- Cost is never estimated from token counts. It is `bounded` by the user's
  `maxUsd` or `unavailable`.
- Critic legs use `worktree: none` and a read-only invocation. Solver and repair
  legs use `isolated-solver`.

## Next agent instructions

1. Add a `ProgressEvent` schema and fixture-driven state-transition tests for
   cancellation, timeout, and budget exhaustion. This completes Milestone 0.
2. Revalidate the Claude Code and Codex noninteractive flags and output shapes
   against current releases. Update `documentationCheckedOn`, the fixtures, and
   the parsers together.
3. Only then start Milestone 1: a process supervisor with timeout and
   cancellation, worktree isolation from an immutable base, and fault-injection
   tests proving the base is never modified on failure.
4. Do not add Parallel, learned routing, or any textual merge of candidates.
5. Run the full test suite and build before handing off and report the exact
   commands and outcomes.
