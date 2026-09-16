# Threat Model

## Scope and assets

The planned controller crosses boundaries among an untrusted repository, local
coding CLIs, provider services, child processes, temporary worktrees, verification
tools, credentials, the user's base worktree, and the provenance ledger.

Assets include source code, uncommitted work, credentials, filesystem integrity,
provider budget, process control, verification evidence, and ledger accuracy.

## Threats and planned controls

### Untrusted repositories and prompt injection

Repository text may instruct agents or tools to exfiltrate secrets, weaken
checks, or exceed scope. Treat all repository content as untrusted data, preserve
system policy precedence, expose only allowlisted tools and paths, and record the
effective task and policy. A model assertion never overrides a deterministic
gate.

### Arbitrary commands

Coding CLIs may request or run destructive, networked, or persistence-producing
commands. Use provider sandbox and approval controls where documented, add an
outer process and filesystem boundary, deny unexpected executable paths, and
make command policy explicit. Sandboxing claims require platform tests.

### Secret exposure

Prompts, subprocess environments, output, patches, and logs can leak credentials.
Pass only required credential references, redact structured events, avoid raw
environment capture, scan candidate patches, and keep secrets out of ledgers.
Users retain and supply their own provider credentials.

### Malicious or unsafe patches

A candidate may add backdoors, disable checks, escape scope, or alter security
configuration. Enforce path and size limits, run configured deterministic checks,
surface sensitive-file changes, require approval according to policy, and apply
only one fully verified candidate.

### Output schema drift

Provider CLIs may rename fields, emit mixed logs, truncate output, or change exit
semantics. Version adapter contracts, validate every event, bound buffers, retain
diagnostics separately, and fail closed on ambiguous terminal state or usage.

### Symlink and worktree attacks

A repository may use symlinks, nested repositories, hooks, path traversal, case
collisions, or races to escape isolation. Pin the base, canonicalize and contain
paths, reject unsafe symlink transitions, disable untrusted hooks, verify object
identity before application, and test platform-specific filesystem behavior.

### Process cancellation and descendants

Cancellation can leave child processes, locks, worktrees, or partial writes.
Supervise process groups, use bounded graceful then forced termination, confirm
descendant exit, make cleanup idempotent, and prohibit base application until all
solver processes stop. Failure or cancellation leaves the base unchanged.

### Judge manipulation

Candidates may include text aimed at the judge or exploit model-family bias.
Separate candidate content from judge instructions, normalize and blind metadata,
require deterministic gates first, constrain judge output to a schema, and fail
closed when selection evidence is insufficient.

### Budget and denial of service

Recursive retries, verbose output, stalled processes, and Parallel fan-out can
consume money, time, memory, or disk. Enforce per-leg and workflow-wide budgets,
timeouts, output limits, repair count, candidate count, and disk quotas before
execution.

## Residual risk

No model judge proves semantic safety, CLI sandbox behavior varies, and local
process isolation may be weaker than a dedicated security boundary. The design
must describe tested guarantees precisely and require human review for high-risk
changes.
