#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ledgerFromDryRun, serializeLedger } from "../ledger/ledger.js";
import { buildDryRunPlan, PlanError } from "../planner/plan.js";
import { renderPlan } from "../planner/render.js";
import { DEFAULT_POLICY } from "../policy/default-policy.js";
import { PolicySchema, type Policy } from "../schemas/policy.js";
import { TaskSchema, type Task } from "../schemas/task.js";
import { SCENARIOS, simulateProgress, SimulationError, type Scenario } from "../progress/simulate.js";
import { validateProgressStream } from "../progress/validate.js";

const USAGE = `inseat-fusion — Milestone 0: static policy and dry-run planning only

Usage:
  inseat-fusion plan <task.json>... [--policy <policy.json>] [--json] [--ledger]
  inseat-fusion simulate <task.json> --scenario <nominal|cancelled|timed-out|budget-exhausted> [--at <legIndex>] [--policy <policy.json>]
  inseat-fusion validate-events <stream.json>...
  inseat-fusion --help

Options:
  --policy <file>    Use a custom static policy instead of the built-in default.
  --json             Emit the DryRunPlan JSON instead of text (plan only).
  --ledger           Emit the dry-run ledger JSON, secrets redacted by key name (plan only).
  --scenario <name>  Fault to simulate (simulate only).
  --at <legIndex>    Leg at which the fault occurs; default 0 (simulate only).

simulate emits a deterministic ProgressStream with origin "dry-run-simulation".
It is a specification exercise, not telemetry. No provider CLI is launched and
no repository is modified by any command.

Exit codes:
  0  success (validate-events: every stream valid)
  1  validate-events found at least one violation
  2  usage error, invalid input, or plan could not be built
`;

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new PlanError(`${path}: ${(error as Error).message}`);
  }
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues.map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`).join("; ");
}

export async function main(argv: string[]): Promise<number> {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    process.stdout.write(USAGE);
    return command ? 0 : 2;
  }
  if (command === "simulate") return simulate(rest);
  if (command === "validate-events") return validateEvents(rest);
  if (command !== "plan") {
    process.stderr.write(`unknown command: ${command}\n\n${USAGE}`);
    return 2;
  }

  const json = rest.includes("--json");
  const ledger = rest.includes("--ledger");
  const policyIdx = rest.indexOf("--policy");
  const policyPath = policyIdx >= 0 ? rest[policyIdx + 1] : undefined;
  const policyValueIdx = policyIdx >= 0 ? policyIdx + 1 : -1;
  const paths = rest.filter((a, i) => !a.startsWith("--") && i !== policyValueIdx);

  if (paths.length === 0) {
    process.stderr.write(`plan requires at least one task path\n\n${USAGE}`);
    return 2;
  }

  try {
    const policy = await loadPolicy(policyPath);
    const outputs: string[] = [];
    for (const path of paths) {
      const plan = buildDryRunPlan(await loadTask(path), policy);
      if (ledger) outputs.push(serializeLedger(ledgerFromDryRun(plan)));
      else if (json) outputs.push(JSON.stringify(plan, null, 2));
      else outputs.push(renderPlan(plan));
    }
    process.stdout.write(outputs.join("\n\n") + "\n");
    return 0;
  } catch (error) {
    if (error instanceof PlanError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

async function loadPolicy(path: string | undefined): Promise<Policy> {
  if (!path) return DEFAULT_POLICY;
  const parsed = PolicySchema.safeParse(await readJson(path));
  if (!parsed.success) throw new PlanError(`${path}: invalid policy: ${formatIssues(parsed.error.issues)}`);
  return parsed.data;
}

async function loadTask(path: string): Promise<Task> {
  const parsed = TaskSchema.safeParse(await readJson(path));
  if (!parsed.success) throw new PlanError(`${path}: invalid task: ${formatIssues(parsed.error.issues)}`);
  return parsed.data;
}

function flagValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function positionals(args: string[], valueFlags: string[]): string[] {
  const skip = new Set(valueFlags.map((f) => args.indexOf(f) + 1).filter((i) => i > 0));
  return args.filter((a, i) => !a.startsWith("--") && !skip.has(i));
}

async function simulate(rest: string[]): Promise<number> {
  const scenario = flagValue(rest, "--scenario");
  const at = flagValue(rest, "--at");
  const [taskPath, ...extra] = positionals(rest, ["--scenario", "--at", "--policy"]);
  if (!taskPath || extra.length > 0 || !scenario || !(SCENARIOS as readonly string[]).includes(scenario)) {
    process.stderr.write(`simulate requires exactly one task path and --scenario <${SCENARIOS.join("|")}>\n\n${USAGE}`);
    return 2;
  }
  const atLeg = at !== undefined ? Number(at) : undefined;
  if (atLeg !== undefined && (!Number.isInteger(atLeg) || atLeg < 0)) {
    process.stderr.write(`--at must be a non-negative integer\n`);
    return 2;
  }
  try {
    const plan = buildDryRunPlan(await loadTask(taskPath), await loadPolicy(flagValue(rest, "--policy")));
    const stream = simulateProgress(plan, { scenario: scenario as Scenario, ...(atLeg !== undefined ? { atLeg } : {}) });
    process.stdout.write(JSON.stringify(stream, null, 2) + "\n");
    return 0;
  } catch (error) {
    if (error instanceof PlanError || error instanceof SimulationError) {
      process.stderr.write(`${error.message}\n`);
      return 2;
    }
    throw error;
  }
}

async function validateEvents(rest: string[]): Promise<number> {
  const paths = positionals(rest, []);
  if (paths.length === 0) {
    process.stderr.write(`validate-events requires at least one stream path\n\n${USAGE}`);
    return 2;
  }
  let invalid = 0;
  for (const path of paths) {
    let input: unknown;
    try {
      input = await readJson(path);
    } catch (error) {
      process.stderr.write(`${(error as Error).message}\n`);
      return 2;
    }
    const result = validateProgressStream(input);
    if (result.ok) {
      const states = Object.entries(result.finalStates).map(([leg, s]) => `${leg}=${s}`).join(" ");
      process.stdout.write(`VALID    ${path}  ${result.eventCount} event(s)  ${states}\n`);
    } else {
      invalid += 1;
      process.stdout.write(`INVALID  ${path}\n`);
      for (const v of result.violations) {
        process.stdout.write(`         [${v.code}] seq=${v.sequence ?? "-"} ${v.legId ?? ""} ${v.message}\n`);
      }
    }
  }
  return invalid > 0 ? 1 : 0;
}

const entry = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (entry && entry === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (error) => {
      process.stderr.write(`${(error as Error).stack ?? error}\n`);
      process.exit(2);
    },
  );
}
