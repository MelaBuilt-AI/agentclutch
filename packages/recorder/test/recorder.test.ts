import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlRecorder, RunStore } from "../src/index.js";

let tempRoot: string;
let storeRoot: string;

beforeEach(async () => {
  tempRoot = await mkdtemp(join(tmpdir(), "agentclutch-recorder-"));
  storeRoot = join(tempRoot, ".agentclutch");
});

afterEach(async () => {
  await rm(tempRoot, { recursive: true, force: true });
});

describe("JsonlRecorder", () => {
  it("creates run directory", async () => {
    const recorder = new JsonlRecorder({ rootDir: storeRoot, runId: "run_001" });

    await recorder.init();

    await expect(stat(recorder.runDir)).resolves.toMatchObject({
      isDirectory: expect.any(Function)
    });
    await expect(stat(recorder.eventsPath)).resolves.toMatchObject({
      isFile: expect.any(Function)
    });
  });

  it("writes JSONL", async () => {
    const recorder = new JsonlRecorder({ rootDir: storeRoot, runId: "run_001" });

    await recorder.record({ type: "test.event", value: 1 });

    await expect(readFile(recorder.eventsPath, "utf8")).resolves.toBe(
      '{"type":"test.event","value":1}\n'
    );
  });

  it("appends multiple events", async () => {
    const recorder = new JsonlRecorder({ rootDir: storeRoot, runId: "run_001" });

    await recorder.record({ index: 1 });
    await recorder.record({ index: 2 });

    const lines = (await readFile(recorder.eventsPath, "utf8"))
      .trim()
      .split("\n");
    expect(lines).toEqual(['{"index":1}', '{"index":2}']);
  });
});

describe("RunStore", () => {
  it("reads events back in order", async () => {
    const store = new RunStore(storeRoot);
    const recorder = await store.createRecorder("run_001");

    await recorder.record({ index: 1 });
    await recorder.record({ index: 2 });

    await expect(store.readEvents("run_001")).resolves.toEqual([
      { index: 1 },
      { index: 2 }
    ]);
  });

  it("lists runs", async () => {
    const store = new RunStore(storeRoot);

    await store.createRecorder("run_b");
    await store.createRecorder("run_a");

    await expect(store.listRuns()).resolves.toEqual(["run_a", "run_b"]);
  });

  it("reads latest run", async () => {
    const store = new RunStore(storeRoot);

    const first = await store.createRecorder("run_001");
    await first.record({ run: "first" });

    await new Promise((resolve) => setTimeout(resolve, 5));

    const second = await store.createRecorder("run_002");
    await second.record({ run: "second" });

    await expect(store.readLatestRun()).resolves.toEqual({
      runId: "run_002",
      events: [{ run: "second" }]
    });
  });

  it("handles missing runs gracefully", async () => {
    const store = new RunStore(storeRoot);

    await expect(store.listRuns()).resolves.toEqual([]);
    await expect(store.readEvents("missing_run")).resolves.toEqual([]);
    await expect(store.readLatestRun()).resolves.toBeUndefined();
    await expect(store.clearRun("missing_run")).resolves.toBeUndefined();
  });

  it("works with action-card, loop-event, decision, and resume-context shaped objects", async () => {
    const store = new RunStore(storeRoot);
    const recorder = await store.createRecorder("run_001");

    const actionCard = {
      type: "agentclutch.action_card.v0",
      id: "acard_001",
      run_id: "run_001",
      created_at: "2026-06-22T04:00:00.000Z",
      proposed_action: { label: "Complete checkout" }
    };
    const loopEvent = {
      type: "agentclutch.loop_event.v0",
      id: "evt_001",
      loopId: "loop_001",
      eventType: "action.proposed",
      timestamp: "2026-06-22T04:00:01.000Z",
      payload: { id: "aprop_001" }
    };
    const decision = {
      type: "agentclutch.user_decision.v0",
      id: "decision_001",
      action_card_id: "acard_001",
      run_id: "run_001",
      decided_at: "2026-06-22T04:00:02.000Z",
      decision: "approve_once"
    };
    const resumeContext = {
      type: "agentclutch.loop_resume_context.v0",
      loopId: "loop_001",
      stepId: "step_001",
      proposalId: "aprop_001",
      sourceMode: "loop_native",
      decision: { type: "approve_once", approvedBy: "tester" },
      continuePolicy: {
        allowSameActionRetry: true,
        requireApprovalForSimilarActions: false
      }
    };

    await recorder.record(actionCard);
    await recorder.record(loopEvent);
    await recorder.record(decision);
    await recorder.record(resumeContext);

    await expect(store.readEvents("run_001")).resolves.toEqual([
      actionCard,
      loopEvent,
      decision,
      resumeContext
    ]);
  });
});
