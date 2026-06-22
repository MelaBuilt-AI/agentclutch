import type {
  ActionProposal,
  ActionProposalInput,
  AgentRuntime,
  LoopContext
} from "./types.js";

function id(prefix: string): string {
  const cryptoObj = globalThis.crypto;

  if (cryptoObj?.randomUUID) {
    return `${prefix}_${cryptoObj.randomUUID()}`;
  }

  return `${prefix}_${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

function defaultRuntimeForSource(
  sourceMode: ActionProposalInput["sourceMode"]
): AgentRuntime {
  switch (sourceMode) {
    case "prompt_guard":
    case "tool_wrapper":
    case "loop_native":
      return "custom";
  }
}

function normalizeLoopContext(
  input: ActionProposalInput["loopContext"]
): LoopContext {
  const context: LoopContext = {
    previousStepIds: input?.previousStepIds ?? []
  };

  if (input?.planSummary !== undefined) {
    context.planSummary = input.planSummary;
  }

  if (input?.whyNow !== undefined) {
    context.whyNow = input.whyNow;
  }

  if (input?.confidence !== undefined) {
    context.confidence = input.confidence;
  }

  return context;
}

export function normalizeActionProposal(
  input: ActionProposalInput
): ActionProposal {
  const proposal: ActionProposal = {
    type: "agentclutch.action_proposal.v0",
    id: input.id ?? id("aprop"),
    loopId: input.loopId ?? id("implicit_loop"),
    stepId: input.stepId ?? "step_001",
    createdAt: input.createdAt ?? new Date().toISOString(),
    sourceMode: input.sourceMode,
    agent: input.agent ?? {
      runtime: defaultRuntimeForSource(input.sourceMode),
      name: `${input.sourceMode}-agent`
    },
    proposedAction: input.proposedAction,
    loopContext: normalizeLoopContext(input.loopContext),
    evidence: input.evidence ?? []
  };

  if (input.userGoal !== undefined) {
    proposal.userGoal = input.userGoal;
  }

  if (input.visibleContext !== undefined) {
    proposal.visibleContext = input.visibleContext;
  }

  if (input.riskHints !== undefined) {
    proposal.riskHints = input.riskHints;
  }

  if (input.metadata !== undefined) {
    proposal.metadata = input.metadata;
  }

  return proposal;
}
