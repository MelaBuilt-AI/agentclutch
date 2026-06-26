import {
  buildActionCard,
  type ActionCard,
  type ChangedField,
  type UserDecision,
} from "@agentclutch/action-card";
import type {
  ActionProposal,
  AgentLoopEvent,
  ClutchDecision,
  LoopResumeContext,
} from "@agentclutch/loop";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  ClutchSession,
  DEFAULT_CONSEQUENCE_REGISTRY,
  applyLessonsToProposal,
  buildActionPatchesFromEditedFields,
  captureLessonsFromEdit,
  classifyConsequence,
  createClutch,
  findConsequenceRegistryEntry,
  generateRunStoryFromJsonl,
  generateRunStory,
  lessonsFilePath,
  loadLessons,
  parseRecorderEventsJsonl,
  riskFromConsequence,
  saveLessons,
  updateLessonsAfterDecision,
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
  it("exposes the default consequence registry", () => {
    expect(DEFAULT_CONSEQUENCE_REGISTRY.map((entry) => entry.id)).toEqual([
      "payment_or_purchase",
      "external_message_send",
      "external_business_submission",
      "local_file_delete",
      "production_change",
      "code_repository_change",
    ]);
  });

  it("finds the matching registry entry", () => {
    const entry = findConsequenceRegistryEntry({
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(entry?.id).toBe("payment_or_purchase");
  });

  it("supports custom registry entries", () => {
    const consequence = classifyConsequence(
      {
        kind: "oauth.approve",
        label: "Approve OAuth permissions",
      },
      [
        {
          id: "identity_or_permission_change",
          description: "OAuth and permission grants.",
          match: {
            includesAny: ["OAUTH", "Permission"],
          },
          consequence: {
            class: "identity_or_permission_change",
            label: "Identity or permission change",
            description:
              "This action may grant access or change account permissions.",
            reversibility: "not_cleanly_reversible",
            blast_radius: "single_user",
            requires_confirmation: true,
            possible_residue: ["A downstream access grant may remain active"],
            compensation_hint: "Revoke the permission grant if needed.",
          },
        },
      ],
    );

    expect(consequence.class).toBe("identity_or_permission_change");
    expect(consequence.compensation_hint).toBe(
      "Revoke the permission grant if needed.",
    );
  });

  it("returns fresh descriptors from registry entries", () => {
    const first = classifyConsequence({
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    first.possible_residue?.push("Mutated in caller");

    const second = classifyConsequence({
      kind: "browser.checkout",
      label: "Complete checkout",
    });

    expect(second.possible_residue).not.toContain("Mutated in caller");
  });

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

  it("classifies GitHub pull request creation as a code repository change", () => {
    const consequence = classifyConsequence({
      kind: "github.pr_create",
      label: "Create pull request",
    });

    expect(consequence.class).toBe("code_repository_change");
    expect(consequence.blast_radius).toBe("team");
  });

  it("does not classify read-only GitHub repository actions as code repository changes", () => {
    const consequence = classifyConsequence({
      kind: "github.repository_read",
      label: "List repository files",
      url: "https://github.com/MelaBuilt-AI/agentclutch",
    });

    expect(consequence.class).toBe("unknown");
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

describe("lessons", () => {
  it("captures lessons from edit decisions and applies matching lessons", async () => {
    const rootDir = await tempRoot("agentclutch-lessons-core-");

    try {
      const editDecision: ClutchDecision = {
        type: "edit",
        approvedBy: "tester",
        decidedAt,
        patch: [
          {
            op: "replace",
            path: "/changed_fields/quantity/after",
            from: 1,
            value: 3,
            reason: "User edited quantity.",
          },
        ],
      };

      const proposalWithQuantity = actionProposalWithQuantity(1);
      const candidates = captureLessonsFromEdit(
        proposalWithQuantity,
        editDecision,
        "2026-06-22T04:02:00.000Z",
      );

      expect(candidates).toEqual([
        expect.objectContaining({
          action_kind: "browser.checkout",
          target_app: "FakeStore",
          field: "quantity",
          original_value: 1,
          corrected_value: 3,
          confidence: 0.8,
          usage_count: 0,
        }),
      ]);

      await saveLessons(candidates, rootDir);
      await expect(loadLessons(rootDir)).resolves.toEqual(candidates);

      const applied = applyLessonsToProposal(
        actionProposalWithQuantity(1),
        await loadLessons(rootDir),
      );

      expect(applied.appliedLessons).toEqual([
        expect.objectContaining({
          field: "quantity",
          original_value: 1,
          corrected_value: 3,
          source: "learned from prior correction",
        }),
      ]);
      expect(
        (applied.proposal.metadata?.["changedFields"] as ChangedField[])[0],
      ).toMatchObject({
        field: "quantity",
        before: 1,
        after: 3,
      });
      expect(applied.proposal.metadata?.["applied_lessons"]).toEqual([
        expect.objectContaining({
          field: "quantity",
          original_value: 1,
          corrected_value: 3,
        }),
      ]);

      const reinforced = updateLessonsAfterDecision(
        candidates,
        applied.appliedLessons,
        "accepted",
      );

      expect(reinforced[0]).toMatchObject({
        confidence: 0.85,
        usage_count: 1,
      });
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
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

  it("records edit lessons and applies them to future matching actions", async () => {
    const rootDir = await tempRoot("agentclutch-lessons-facade-");
    const records: unknown[] = [];

    try {
      const clutch = createClutch({
        runId: "run_lessons_1",
        lessonsRootDir: rootDir,
        recorder: {
          async record(event) {
            records.push(event);
          },
        },
        renderer: {
          decide: async (_proposal, card) => {
            const appliedLessons = card?.metadata?.["applied_lessons"];

            if (Array.isArray(appliedLessons) && appliedLessons.length > 0) {
              return {
                type: "approve_once",
                approvedBy: "tester",
                decidedAt,
              };
            }

            return {
              type: "edit",
              approvedBy: "tester",
              decidedAt,
              patch: [
                {
                  op: "replace",
                  path: "/changed_fields/quantity/after",
                  from: 1,
                  value: 3,
                },
              ],
            };
          },
        },
      });

      const first = await clutch.onActionProposed(
        actionProposalWithQuantity(1),
      );
      expect(first.decision.type).toBe("edit");

      const stored = JSON.parse(
        await readFile(lessonsFilePath(rootDir), "utf8"),
      ) as unknown;
      expect(stored).toEqual([
        expect.objectContaining({
          field: "quantity",
          original_value: 1,
          corrected_value: 3,
        }),
      ]);

      const second = await clutch.onActionProposed(
        actionProposalWithQuantity(1, "aprop_lessons_2"),
      );

      expect(second.appliedLessons).toHaveLength(1);
      expect(second.card.metadata?.["applied_lessons"]).toEqual([
        expect.objectContaining({
          field: "quantity",
          original_value: 1,
          corrected_value: 3,
        }),
      ]);
      expect(second.card.proposed_action.changed_fields?.[0]).toMatchObject({
        field: "quantity",
        before: 1,
        after: 3,
      });
      expect(records.map(eventType)).toContain("lesson.captured");
      expect(records.map(eventType)).toContain("lesson.applied");
      expect(records.map(eventType)).toContain("lesson.reinforced");
    } finally {
      await rm(rootDir, { recursive: true, force: true });
    }
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
      "AgentClutch paused before Complete checkout because payment or purchase is compensable. Possible residue: Order record may be created; Payment authorization may be captured. Compensation: Cancel order or request refund if available.",
      "tester approved the action once.",
      "AgentClutch returned resume context: the same action can continue; similar actions do not require extra approval.",
      "Final result: Checkout completed in the demo store.",
    ]);
    expect(story.summary).toBe(
      "The run included 1 proposed action(s), 1 AgentClutch pause(s), 1 user decision event(s) and 1 final result event(s).",
    );
  });

  it("includes residue and compensation in consequence summaries", () => {
    const card = testCard();
    const story = generateRunStory(
      "run_test_1",
      [
        {
          ...card,
          consequence: {
            class: "payment_or_purchase",
            label: "Payment or purchase",
            description: "This action may spend money or place an order.",
            reversibility: "compensable",
            blast_radius: "single_user",
            requires_confirmation: true,
            possible_residue: [
              "Order record may be created",
              "Payment authorization may be captured",
            ],
            compensation_hint: "Cancel order or request refund if available.",
          },
        },
      ],
      {
        createdAt: "2026-06-22T04:02:00.000Z",
      },
    );

    expect(story.steps[1]?.text).toBe(
      "AgentClutch paused before Complete checkout because payment or purchase is compensable. Possible residue: Order record may be created; Payment authorization may be captured. Compensation: Cancel order or request refund if available.",
    );
  });

  it("records lesson events in Run Story output", () => {
    const story = generateRunStory(
      "run_test_1",
      [
        loopEvent("lesson.applied", "2026-06-22T04:00:01.000Z", {
          summary: "Lesson applied: quantity: 1 -> 3",
        }),
        loopEvent("lesson.rejected", "2026-06-22T04:00:02.000Z", {
          summary: "Lesson rejected: quantity: 1 -> 3",
        }),
        loopEvent("lesson.reinforced", "2026-06-22T04:00:03.000Z", {
          summary: "Lesson reinforced: quantity: 1 -> 3",
        }),
      ],
      {
        createdAt: "2026-06-22T04:02:00.000Z",
      },
    );

    expect(story.steps.map((step) => step.text)).toEqual([
      "Lesson applied: quantity: 1 -> 3.",
      "Lesson rejected: quantity: 1 -> 3.",
      "Lesson reinforced: quantity: 1 -> 3.",
    ]);
    expect(story.summary).toContain("3 lesson event(s)");
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

function actionProposalWithQuantity(
  quantity: number,
  id = "aprop_lessons_1",
): ActionProposal {
  return {
    ...actionProposal(),
    id,
    proposedAction: {
      ...actionProposal().proposedAction,
      rawInput: {
        selector: "#checkout",
        changedFields: [
          {
            field: "quantity",
            after: quantity,
            editable: true,
          },
        ],
      },
    },
    visibleContext: {
      fields: {
        quantity,
      },
    },
    metadata: {
      changedFields: [
        {
          field: "quantity",
          after: quantity,
          editable: true,
        },
      ],
    },
  };
}

async function tempRoot(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}

function eventType(event: unknown): string | undefined {
  if (typeof event !== "object" || event === null) return undefined;

  const record = event as Record<string, unknown>;

  if (typeof record["eventType"] === "string") return record["eventType"];
  if (typeof record["type"] === "string") return record["type"];

  return undefined;
}
