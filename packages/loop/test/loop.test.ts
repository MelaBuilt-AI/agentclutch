import { describe, expect, it } from "vitest";
import {
  buildResumeContext,
  normalizeActionProposal,
  type ActionProposal,
  type ClutchDecision
} from "../src/index.js";

const createdAt = "2026-06-22T04:00:00.000Z";
const decidedAt = "2026-06-22T04:01:00.000Z";

function proposal(overrides: Partial<ActionProposal> = {}): ActionProposal {
  return {
    type: "agentclutch.action_proposal.v0",
    id: "aprop_test_1",
    loopId: "loop_test_1",
    stepId: "step_001",
    createdAt,
    sourceMode: "loop_native",
    agent: {
      runtime: "custom",
      name: "test-agent"
    },
    proposedAction: {
      kind: "email.send",
      label: "Send email",
      targetSurface: "email",
      targetApp: "Gmail",
      rawInput: {
        to: "client@example.com",
        subject: "Follow-up"
      }
    },
    loopContext: {
      previousStepIds: []
    },
    evidence: [],
    ...overrides
  };
}

describe("normalizeActionProposal", () => {
  it("normalizes prompt_guard inputs", () => {
    const normalized = normalizeActionProposal({
      sourceMode: "prompt_guard",
      id: "aprop_prompt_1",
      loopId: "loop_prompt_1",
      createdAt,
      userGoal: {
        original: "Send a follow-up email",
        summary: "Send follow-up email"
      },
      proposedAction: {
        kind: "email.send",
        label: "Send email",
        targetSurface: "email"
      }
    });

    expect(normalized).toMatchObject({
      type: "agentclutch.action_proposal.v0",
      id: "aprop_prompt_1",
      loopId: "loop_prompt_1",
      stepId: "step_001",
      createdAt,
      sourceMode: "prompt_guard",
      agent: {
        runtime: "custom",
        name: "prompt_guard-agent"
      },
      loopContext: {
        previousStepIds: []
      },
      evidence: []
    });
  });

  it("normalizes tool_wrapper inputs", () => {
    const normalized = normalizeActionProposal({
      sourceMode: "tool_wrapper",
      id: "aprop_tool_1",
      loopId: "loop_tool_1",
      stepId: "step_002",
      createdAt,
      agent: {
        runtime: "mcp",
        name: "mcp-agent"
      },
      proposedAction: {
        kind: "mcp.tool_call",
        label: "Call CRM update tool",
        targetSurface: "mcp",
        targetApp: "CRM",
        rawInput: { accountId: "acct_123" }
      },
      evidence: [
        {
          label: "Tool args",
          source: "tool_wrapper",
          summary: "The account ID came from the wrapped tool call."
        }
      ]
    });

    expect(normalized.sourceMode).toBe("tool_wrapper");
    expect(normalized.agent.runtime).toBe("mcp");
    expect(normalized.evidence).toHaveLength(1);
    expect(normalized.proposedAction.rawInput).toEqual({ accountId: "acct_123" });
  });

  it("normalizes loop_native inputs", () => {
    const normalized = normalizeActionProposal({
      sourceMode: "loop_native",
      id: "aprop_loop_1",
      loopId: "loop_native_1",
      stepId: "step_007",
      createdAt,
      agent: {
        runtime: "langgraph",
        model: "test-model"
      },
      proposedAction: {
        kind: "browser.checkout",
        label: "Complete checkout",
        targetSurface: "browser",
        targetIdentifier: "#checkout"
      },
      loopContext: {
        previousStepIds: ["step_005", "step_006"],
        planSummary: "Select item and complete checkout",
        whyNow: "The cart is ready",
        confidence: 0.82
      }
    });

    expect(normalized).toMatchObject({
      sourceMode: "loop_native",
      loopId: "loop_native_1",
      stepId: "step_007",
      agent: {
        runtime: "langgraph",
        model: "test-model"
      },
      loopContext: {
        previousStepIds: ["step_005", "step_006"],
        planSummary: "Select item and complete checkout",
        whyNow: "The cart is ready",
        confidence: 0.82
      }
    });
  });
});

describe("buildResumeContext", () => {
  it("builds approve_once resume context", () => {
    const decision: ClutchDecision = {
      type: "approve_once",
      approvedBy: "user_1",
      decidedAt
    };

    const context = buildResumeContext(proposal(), decision);

    expect(context).toMatchObject({
      type: "agentclutch.loop_resume_context.v0",
      loopId: "loop_test_1",
      stepId: "step_001",
      proposalId: "aprop_test_1",
      sourceMode: "loop_native",
      decision,
      continuePolicy: {
        allowSameActionRetry: true,
        requireApprovalForSimilarActions: false,
        maxRetries: 1
      }
    });
    expect(context.instructionForAgent).toBeUndefined();
  });

  it("builds edit resume context", () => {
    const decision: ClutchDecision = {
      type: "edit",
      approvedBy: "user_1",
      decidedAt,
      patch: [
        {
          op: "replace",
          path: "/subject",
          from: "Follow-up",
          value: "Updated follow-up",
          reason: "Use clearer subject"
        }
      ],
      note: "Subject corrected"
    };

    const context = buildResumeContext(proposal(), decision);

    expect(context.userCorrection).toEqual({
      before: {
        to: "client@example.com",
        subject: "Follow-up"
      },
      after: decision.patch,
      explanation: "Subject corrected"
    });
    expect(context.continuePolicy).toMatchObject({
      allowSameActionRetry: true,
      requireApprovalForSimilarActions: true
    });
    expect(context.instructionForAgent).toContain("corrected action");
  });

  it("builds block resume context", () => {
    const decision: ClutchDecision = {
      type: "block",
      blockedBy: "user_1",
      decidedAt,
      reason: "Wrong recipient"
    };

    const context = buildResumeContext(proposal(), decision);

    expect(context.continuePolicy).toMatchObject({
      allowSameActionRetry: false,
      requireApprovalForSimilarActions: true
    });
    expect(context.instructionForAgent).toBe(
      "The proposed action was blocked: Wrong recipient. Re-plan without attempting the same side effect."
    );
  });

  it("builds takeover resume context", () => {
    const decision: ClutchDecision = {
      type: "takeover",
      operator: "user_1",
      decidedAt,
      resumeMode: "resume_from_current_state"
    };

    const context = buildResumeContext(proposal(), decision);

    expect(context.continuePolicy).toMatchObject({
      allowSameActionRetry: false,
      requireApprovalForSimilarActions: true
    });
    expect(context.instructionForAgent).toBe(
      "The human took over. Observe the current state before continuing."
    );
  });

  it("builds create_rule resume context", () => {
    const decision: ClutchDecision = {
      type: "create_rule",
      approvedBy: "user_1",
      decidedAt,
      rule: {
        id: "rule_1",
        description: "Require clutch for external email",
        match: {
          kind: "email.send"
        },
        decision: "require_clutch"
      }
    };

    const context = buildResumeContext(proposal(), decision);

    expect(context.continuePolicy).toMatchObject({
      allowSameActionRetry: false,
      requireApprovalForSimilarActions: true
    });
    expect(context.instructionForAgent).toBe(
      "A new rule was created from this decision. Apply the rule to similar future actions."
    );
  });
});
