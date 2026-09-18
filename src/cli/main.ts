#!/usr/bin/env node
import { readFile, realpath } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { ledgerFromDryRun, serializeLedger } from "../ledger/ledger.js";
import { buildDryRunPlan, PlanError } from "../planner/plan.js";
import { renderPlan } from "../planner/render.js";
import { DEFAULT_POLICY } from "../policy/default-policy.js";
import { PolicySchema, type Policy } from "../schemas/policy.js";
import { TaskSchema } from "../schemas/task.js";

const USAGE = `inseat-fusion — Milestone 0: static policy and dry-run planning only

Usage:
  inseat-fusion plan <task.json>... [--policy <policy.json>] [--json] [--ledger]
  inseat-fusion --help

Options:
  --policy <file>  Use a custom static policy instead of the built-in default.
  --json           Emit the DryRunPlan JSON instead of text.
  --ledger         Emit the dry-run ledger JSON (secrets redacted by key name).

This command never launches a provider CLI and never modifies a repository.

Exit codes:
  0  plan rendered
  2  usage error, invalid task, invalid policy, or plan could not be built
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
    let policy: Policy = DEFAULT_POLICY;
    if (policyPath) {
      const parsed = PolicySchema.safeParse(await readJson(policyPath));
      if (!parsed.success) throw new PlanError(`${policyPath}: invalid policy: ${formatIssues(parsed.error.issues)}`);
      policy = parsed.data;
    }

    const outputs: string[] = [];
    for (const path of paths) {
      const parsed = TaskSchema.safeParse(await readJson(path));
      if (!parsed.success) throw new PlanError(`${path}: invalid task: ${formatIssues(parsed.error.issues)}`);
      const plan = buildDryRunPlan(parsed.data, policy);
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
