import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunStore } from "@agentclutch/recorder";
import {
  formatInspectRun,
  inspectRun,
  resolveInspectTarget,
} from "../src/commands/inspect.js";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe("inspect command", () => {
  it("formats a run summary from recorder events", () => {
    const output = formatInspectRun({
      runId: "run_demo_001",
      events: [
        { type: "agentclutch.loop_event.v0", event: "action.proposed" },
        { type: "agentclutch.action_card.v0", id: "card_001", proposed_action: { label: "Complete checkout", kind: "browser.checkout" }, consequence: { label: "Payment or purchase" }, risk: { level: "medium" } },
        { type: "agentclutch.user_decision.v0", decision: "approve_once" },
        { type: "agentclutch.loop_resume_context.v0", status: "approved" },
      ],
    });

    expect(output).toContain("Run: run_demo_001");
    expect(output).toContain("Events: 4");
    expect(output).toContain("Action Card: Complete checkout (browser.checkout)");
    expect(output).toContain("Consequence: Payment or purchase");
    expect(output).toContain("Risk: medium");
    expect(output).toContain("Decision: approve_once");
    expect(output).toContain("Resume status: approved");
  });

  it("resolves latest to the newest run id", async () => {
    const rootDir = await tempRoot();
    const store = new RunStore(rootDir);
    await (await store.createRecorder("run_old")).record({ type: "old" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await (await store.createRecorder("run_new")).record({ type: "new" });

    await expect(resolveInspectTarget("latest", store)).resolves.toBe("run_new");
  });

  it("inspects a named run from a root directory", async () => {
    const rootDir = await tempRoot();
    const store = new RunStore(rootDir);
    await (await store.createRecorder("run_named")).record({
      type: "agentclutch.user_decision.v0",
      decision: "block",
    });

    await expect(inspectRun("run_named", rootDir)).resolves.toContain("Decision: block");
  });
});

async function tempRoot(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "agentclutch-cli-inspect-"));
  tempDirs.push(dir);
  return dir;
}
