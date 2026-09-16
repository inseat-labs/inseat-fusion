# ADR-001: Keep Inseat Fusion Separate from Inseat Switch

- Status: accepted for planning
- Date: 2026-09-16

## Context

Inseat Switch is planned to test whether a candidate model preserves an existing
workflow contract during migration. Inseat Fusion is planned to select and
control compound coding workflows during task execution. Combining them would
mix migration evidence with orchestration, credentials, process supervision,
repository mutation, and a much larger threat model.

## Decision

Keep separate repositories, names, roadmaps, schemas, and release decisions.
Future shared fixture formats may be considered only through a versioned neutral
contract. Neither project may import the other's private implementation details
or imply that success in one validates the other.

## Consequences

- Each project retains a legible purpose and smaller security boundary.
- Some schema and evaluation concepts may be duplicated initially.
- Cross-project reuse requires explicit compatibility work rather than coupling.
