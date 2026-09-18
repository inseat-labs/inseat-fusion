import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { main } from "../src/cli/main.js";

const task = join(import.meta.dirname, "..", "examples", "tasks", "low-risk-single.json");

function capture() {
  const chunks: string[] = [];
  const orig = process.stdout.write.bind(process.stdout);
  process.stdout.write = ((c: string | Uint8Array) => {
    chunks.push(String(c));
    return true;
  }) as typeof process.stdout.write;
  return { text: () => chunks.join(""), restore: () => (process.stdout.write = orig) };
}

describe("cli", () => {
  it("plans a task without --policy", async () => {
    const out = capture();
    try {
      expect(await main(["plan", task])).toBe(0);
      expect(out.text()).toContain("DRY RUN");
    } finally {
      out.restore();
    }
  });

  it("returns 2 when no task path is given", async () => {
    const out = capture();
    try {
      expect(await main(["plan", "--json"])).toBe(2);
    } finally {
      out.restore();
    }
  });
});
