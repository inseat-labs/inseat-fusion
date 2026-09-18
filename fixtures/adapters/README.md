# Adapter contract fixtures

Synthetic raw-output samples used to test `parseOutput` for each adapter. They
are modeled on the publicly documented shapes as of 2026-09-16 and must be
revalidated against current CLI releases before Milestone 1. They are not
recordings of real sessions.

| Adapter | File | Expected outcome |
| --- | --- | --- |
| claude-code | `success.json` | `succeeded`, usage reported |
| claude-code | `error.json` | `failed` (`error_max_turns`), usage reported |
| claude-code | `missing-usage.json` | `succeeded`, usage `unavailable` |
| claude-code | `malformed.txt` | `malformed-output` |
| claude-code | `schema-drift.json` | `schema-drift` |
| codex | `success.jsonl` | `succeeded`, usage reported |
| codex | `incomplete.jsonl` | `failed` (no `turn.completed`) |
| codex | `missing-usage.jsonl` | `succeeded`, usage `unavailable` |
| codex | `malformed.jsonl` | `malformed-output` |
| codex | `schema-drift.jsonl` | `schema-drift` |

Timeout and cancellation are process-supervisor outcomes (Milestone 1) and have
no raw-output fixture here.
