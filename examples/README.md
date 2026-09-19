# Examples

`tasks/` holds synthetic task files. Render their dry-run plans with:

```bash
npm run plan:examples
```

| File | Risk | Bindings | Policy result |
| --- | --- | --- | --- |
| `low-risk-single.json` | low | primary only | `single` |
| `medium-risk-cascade.json` | medium | primary + escalation, 2 verification commands | `cascade` |
| `high-risk-critique.json` | high | primary + critic, no `maxUsd` | `critique`; cost reported `unavailable` |

Repository paths and revisions are placeholders. Dry-run planning never reads
the repository, launches a CLI, or writes files. Model identifiers are examples
for shape only and are not recommendations.

## Simulating progress

```bash
npm run dev -- simulate examples/tasks/medium-risk-cascade.json --scenario cancelled --at 0
npm run dev -- simulate examples/tasks/high-risk-critique.json --scenario budget-exhausted --at 2
```

Output is a `ProgressStream` with `origin: "dry-run-simulation"`. It is a
deterministic walk through the state machine for the plan, not a prediction of
runtime behavior. Validate any stream with `npm run dev -- validate-events <file>`.
