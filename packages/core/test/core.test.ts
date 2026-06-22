import {
  buildActionCard,
  type ActionCard,
  type UserDecision,
} from "@agentclutch/action-card";
import type {
  ActionProposal,
  AgentLoopEvent,
  ClutchDecision,
  LoopResumeContext,
} from "@agentclutch/loop";
import { describe, expect, it, vi } from "vitest";
import {
  ClutchSession,
  buildActionPatchesFromEditedFields,
  classifyConsequence,
  createClutch,
  generateRunStoryFromJsonl,
  generateRunStory,
  parseRecorderEventsJsonl,
  riskFromConsequence,
} from "../src/index.js";

const createdAt = "2026-06-22T04:00:00.000Z";
const decidedAt = "2026-06-22T04:01:00.000Z";

function testCard(): ActionCard {
  return buildActionCard({
    id: "acard_test_1",
    run_id: "run_test_1",
    created_at: createdAt,
    agent: { name: "test-agent", runtime: "custom" },
    proposed_action: {
      id: "act_test_1",
      kind: "browser.checkout",
      label: "Complete checkout",
      surface: "browser",
      target: {
        surface: "browser",
        button_text: "Complete checkout",
      },
    },
    consequence: classifyConsequence({
      kind: "browser.checkout",
      label: "Complete checkout",
    }),
    risk: riskFromConsequence(
      classifyConsequence({
        kind: "browser.checkout",
        label: "Complete checkout",
      }),
    ),
  });
}

function approveDecision(): UserDecision {
  return {
    type: "agentclutch.user_decision.v0",
    id: "decision_test_1",
    action_card_id: "acard_test_1",
    run_id: "run_test_1",
    decided_at: decidedAt,
    decision: "approve_once",
  };
}

function actionProposal(): ActionProposal {
  return {
    type: "agentclutch.action_proposal.v0",
    id: "aprop_test_1",
    loopId: "loop_test_1",
    stepId: "step_001",
    createdAt: "2026-06-22T04:00:00.000Z",
    sourceMode: "loop_native",
    agent: { name: "test-agent", runtime: "custom" },
    proposedAction: {
      kind: "browser.checkout",
      label: "Complete checkout",
      targetSurface: "browser",
      targetApp: "FakeStore",
    },
    loopContext: {
      previousStepIds: [],
      whyNow: "The cart is ready for checkout.",
    },
    evidence: [],
  };
}

function clutchApproveDecision(): ClutchDecision {
  return {
    type: "approve_once",
    approvedBy: "tester",
    decidedAt,
  };
}

function resumeContext(): LoopResumeContext {
  return {
    type: "agentclutch.loop_resume_context.v0",
    loopId: "loop_test_1",
    stepId: "step_001",
    proposalId: "aprop_test_1",
    sourceMode: "loop_native",
    decision: clutchApproveDecision(),
    continuePolicy: {
      allowSameActionRetry: true,
      requireApprovalForSimilarActions: false,
      maxRetries: 1,
    },
  };
}

function loopEvent<TPayload>(
  eventType: AgentLoopEvent<TPayload>["eventType"],
  timestamp: string,
  payload: TPayload,
): AgentLoopEvent<TPayload> {
  return {
    type: "agentclutch.loop_event.v0",
    id: `evt_${eventType.replaceAll(".", "_")}`,
    loopId: "loop_test_1",
    stepId: "step_001",
    eventType,
    timestamp,
    payload,
  };
}

describe("classifyConsequence", () => {
  it("classifies checkout consequence", () => {
    const consequence = classifyConsequence({
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(consequence.class).toBe("payment_or_purchase");
    expect(consequence.reversibility).toBe("compensable");
  });

  it("classifies email send consequence", () => {
    const consequence = classifyConsequence({
      kind: "email.send",
      label: "Send email",
    });

    expect(consequence.class).toBe("external_message_send");
    expect(consequence.blast_radius).toBe("team");
  });

  it("classifies submit form consequence", () => {
    const consequence = classifyConsequence({
      kind: "browser.form_submit",
      label: "Submit expense report",
    });

    expect(consequence.class).toBe("external_business_submission");
    expect(consequence.reversibility).toBe("not_cleanly_reversible");
  });

  it("classifies delete consequence", () => {
    const consequence = classifyConsequence({
      kind: "file.delete",
      label: "Delete file",
    });

    expect(consequence.class).toBe("local_file_delete");
    expect(consequence.blast_radius).toBe("workspace");
  });

  it("classifies deploy and merge consequence", () => {
    const deploy = classifyConsequence({
      kind: "shell.exec",
      label: "Deploy to production",
    });
    const merge = classifyConsequence({
      kind: "github.write",
      label: "Merge pull request",
    });

    expect(deploy.class).toBe("production_change");
    expect(merge.class).toBe("production_change");
  });

  it("classifies unknown consequence", () => {
    const consequence = classifyConsequence({
      kind: "custom",
      label: "Do thing",
    });

    expect(consequence.class).toBe("unknown");
    expect(consequence.requires_confirmation).toBe(true);
  });
});

describe("riskFromConsequence", () => {
  it("scores consequence risk", () => {
    const risk = riskFromConsequence({
      class: "production_change",
      label: "Production change",
      reversibility: "irreversible",
      blast_radius: "production",
      requires_confirmation: true,
    });

    expect(risk.score).toBe(100);
    expect(risk.level).toBe("critical");
    expect(risk.reasons).toContain("This action may be irreversible.");
  });
});

describe("ClutchSession", () => {
  it("tracks session transitions", () => {
    const session = new ClutchSession("run_test_1");

    expect(session.snapshot().state).toBe("idle");
    session.start();
    expect(session.snapshot().state).toBe("running");

    session.proposeAction(testCard());
    expect(session.snapshot().state).toBe("action_pending");
    expect(session.snapshot().current_action_card?.id).toBe("acard_test_1");

    session.decide(approveDecision());
    expect(session.snapshot().state).toBe("running");
    expect(session.snapshot().current_action_card).toBeUndefined();

    session.pause();
    expect(session.snapshot().state).toBe("paused");
    session.resume();
    expect(session.snapshot().state).toBe("running");
    session.complete();
    expect(session.snapshot().state).toBe("completed");
  });
});

describe("buildActionPatchesFromEditedFields", () => {
  it("builds replace patches from edited Action Card fields", () => {
    expect(
      buildActionPatchesFromEditedFields([
        {
          field: "quantity",
          before: 1,
          after: 3,
          editable: true,
        },
        {
          field: "shipping/address",
          before: "Old",
          after: "New",
          editable: true,
        },
      ]),
    ).toEqual([
      {
        op: "replace",
        path: "/changed_fields/quantity/after",
        from: 1,
        value: 3,
        reason: "User edited quantity.",
      },
      {
        op: "replace",
        path: "/changed_fields/shipping~1address/after",
        from: "Old",
        value: "New",
        reason: "User edited shipping/address.",
      },
    ]);
  });
});

describe("createClutch", () => {
  it("supports confirmAction prompt_guard path", async () => {
    const clutch = createClutch({
      runId: "run_prompt_1",
      renderer: {
        decide: async () => ({
          type: "approve_once",
          approvedBy: "tester",
          decidedAt,
        }),
      },
    });

    const result = await clutch.confirmAction({
      id: "aprop_prompt_1",
      loopId: "loop_prompt_1",
      createdAt,
      proposedAction: {
        kind: "email.send",
        label: "Send email",
        targetSurface: "email",
      },
    });

    expect(result.proposal.sourceMode).toBe("prompt_guard");
    expect(result.card.consequence.class).toBe("external_message_send");
    expect(result.resumeContext.decision.type).toBe("approve_once");
  });

  it("supports wrapTool approve path", async () => {
    const tool = vi.fn(async (to: string) => `sent:${to}`);
    const clutch = createClutch({
      renderer: {
        decide: async () => ({
          type: "approve_once",
          approvedBy: "tester",
          decidedAt,
        }),
      },
    });
    const guarded = clutch.wrapTool(tool, {
      kind: "email.send",
      label: "Send email",
      targetSurface: "email",
    });

    await expect(guarded("client@example.com")).resolves.toBe(
      "sent:client@example.com",
    );
    expect(tool).toHaveBeenCalledWith("client@example.com");
  });

  it("supports wrapTool block path", async () => {
    const tool = vi.fn(async () => "deleted");
    const clutch = createClutch({
      renderer: {
        decide: async () => ({
          type: "block",
          blockedBy: "tester",
          decidedAt,
          reason: "No",
        }),
      },
    });
    const guarded = clutch.wrapTool(tool, {
      kind: "file.delete",
      label: "Delete file",
      targetSurface: "filesystem",
    });

    await expect(guarded()).resolves.toBeUndefined();
    expect(tool).not.toHaveBeenCalled();
  });

  it("supports onActionProposed loop_native path", async () => {
    const clutch = createClutch({
      renderer: {
        decide: async () => ({
          type: "approve_once",
          approvedBy: "tester",
          decidedAt,
        }),
      },
    });

    const result = await clutch.onActionProposed({
      id: "aprop_loop_1",
      loopId: "loop_native_1",
      stepId: "step_007",
      createdAt,
      sourceMode: "loop_native",
      agent: { runtime: "custom", name: "loop-agent" },
      proposedAction: {
        kind: "browser.checkout",
        label: "Complete checkout",
        targetSurface: "browser",
      },
      loopContext: {
        previousStepIds: ["step_006"],
      },
      evidence: [],
    });

    expect(result.proposal.sourceMode).toBe("loop_native");
    expect(result.proposal.loopId).toBe("loop_native_1");
    expect(result.card.consequence.class).toBe("payment_or_purchase");
  });
});

describe("generateRunStory", () => {
  it("generates a Run Story from action cards and decisions", () => {
    const story = generateRunStory(
      "run_test_1",
      [testCard(), approveDecision()],
      {
        createdAt: "2026-06-22T04:02:00.000Z",
      },
    );

    expect(story.type).toBe("agentclutch.run_story.v0");
    expect(story.steps).toHaveLength(3);
    expect(story.steps[0]?.text).toContain("The agent proposed");
    expect(story.steps[1]?.text).toContain("AgentClutch paused");
    expect(story.steps[2]?.text).toBe("The user approved the action once.");
    expect(story.summary).toBe(
      "The run included 1 proposed action(s), 1 AgentClutch pause(s), 1 user decision event(s).",
    );
  });

  it("generates a full timeline from recorder loop events", () => {
    const story = generateRunStory(
      "run_test_1",
      [
        loopEvent(
          "action.proposed",
          "2026-06-22T04:00:00.000Z",
          actionProposal(),
        ),
        testCard(),
        loopEvent(
          "user.decision",
          "2026-06-22T04:01:00.000Z",
          clutchApproveDecision(),
        ),
        loopEvent(
          "resume_context.created",
          "2026-06-22T04:01:01.000Z",
          resumeContext(),
        ),
        loopEvent("action.executed", "2026-06-22T04:01:10.000Z", {
          summary: "Checkout completed in the demo store",
        }),
      ],
      {
        createdAt: "2026-06-22T04:02:00.000Z",
      },
    );

    expect(story.steps.map((step) => step.actor)).toEqual([
      "agent",
      "system",
      "user",
      "system",
      "system",
    ]);
    expect(story.steps.map((step) => step.text)).toEqual([
      "The agent proposed action: Complete checkout on FakeStore.",
      "AgentClutch paused before Complete checkout because payment or purchase is compensable.",
      "tester approved the action once.",
      "AgentClutch returned resume context: the same action can continue; similar actions do not require extra approval.",
      "Final result: Checkout completed in the demo store.",
    ]);
    expect(story.summary).toBe(
      "The run included 1 proposed action(s), 1 AgentClutch pause(s), 1 user decision event(s) and 1 final result event(s).",
    );
  });

  it("parses recorder JSONL and infers the run id", () => {
    const jsonl = [
      JSON.stringify(
        loopEvent(
          "action.proposed",
          "2026-06-22T04:00:00.000Z",
          actionProposal(),
        ),
      ),
      JSON.stringify(testCard()),
      JSON.stringify(
        loopEvent(
          "user.decision",
          "2026-06-22T04:01:00.000Z",
          clutchApproveDecision(),
        ),
      ),
      JSON.stringify(
        loopEvent(
          "resume_context.created",
          "2026-06-22T04:01:01.000Z",
          resumeContext(),
        ),
      ),
    ].join("\n");

    expect(parseRecorderEventsJsonl(`${jsonl}\n`)).toHaveLength(4);

    const story = generateRunStoryFromJsonl(jsonl, {
      createdAt: "2026-06-22T04:02:00.000Z",
    });

    expect(story.run_id).toBe("run_test_1");
    expect(story.steps).toHaveLength(4);
  });

  it("reports invalid recorder JSONL line numbers", () => {
    expect(() => parseRecorderEventsJsonl("{}\nnot-json")).toThrow(
      "Invalid recorder JSONL on line 2",
    );
  });
});
