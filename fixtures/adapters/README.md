# Adapter contract fixtures

Synthetic raw-output samples used to test `parseOutput` for each adapter. They
are modeled on the shapes documented in the official sources listed in
[`docs/CLI_CONTRACTS.md`](../../docs/CLI_CONTRACTS.md), revalidated on
2026-09-19. They are not recordings of real sessions and were never produced by
running a paid model task.

| Adapter | File | Expected outcome |
| --- | --- | --- |
| claude-code | `success.json` | `succeeded`, usage reported, model from `modelUsage` |
| claude-code | `error.json` | `failed` (`error_max_turns`), usage reported |
| claude-code | `budget-exhausted.json` | `budget-exhausted` (`error_max_budget_usd`) |
| claude-code | `permission-denied.json` | `succeeded` with a warning about `permission_denials` |
| claude-code | `missing-usage.json` | `succeeded`, usage `unavailable` |
| claude-code | `malformed.txt` | `malformed-output` |
| claude-code | `schema-drift.json` | `schema-drift` |
| codex | `success.jsonl` | `succeeded`, usage reported, `changedFiles` from `file_change` |
| codex | `turn-failed.jsonl` | `failed` via `turn.failed` |
| codex | `thread-error.jsonl` | `failed` via top-level `error` event |
| codex | `incomplete.jsonl` | `failed` (no `turn.completed`) |
| codex | `missing-usage.jsonl` | `succeeded`, usage `unavailable` |
| codex | `malformed.jsonl` | `malformed-output` |
| codex | `schema-drift.jsonl` | `schema-drift` |

Timeout and cancellation are process-supervisor outcomes (Milestone 1) and have
no raw-output fixture here. Their state transitions are covered by the progress
event fixtures in `fixtures/progress/`.
