import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const workflowDirectory = new URL("../.github/workflows/", import.meta.url);
const workflows = readdirSync(workflowDirectory)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
  .map((name) => ({
    name,
    contents: readFileSync(new URL(name, workflowDirectory), "utf8"),
  }));

const approvedNode24Actions = new Map([
  ["actions/checkout", "df4cb1c069e1874edd31b4311f1884172cec0e10"],
  ["actions/setup-node", "48b55a011bda9f5d6aeb4c2d9c7362e8dae4041e"],
  ["pnpm/action-setup", "0ebf47130e4866e96fce0953f49152a61190b271"],
]);

test("JavaScript workflow actions use reviewed Node 24-compatible commit pins", () => {
  let checkedUses = 0;

  for (const workflow of workflows) {
    for (const match of workflow.contents.matchAll(
      /^\s*uses:\s*(actions\/checkout|actions\/setup-node|pnpm\/action-setup)@([^\s#]+)/gm,
    )) {
      const [, action, reference] = match;
      checkedUses += 1;
      assert.equal(
        reference,
        approvedNode24Actions.get(action),
        `${workflow.name} must pin ${action} to the reviewed Node 24-compatible commit`,
      );
    }
  }

  assert.ok(checkedUses > 0, "expected to inspect at least one workflow action");
});
