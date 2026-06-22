import type {
  ActionProposal,
  ClutchDecision,
  LoopResumeContext
} from "./types.js";

export function buildResumeContext(
  proposal: ActionProposal,
  decision: ClutchDecision
): LoopResumeContext {
  const base: LoopResumeContext = {
    type: "agentclutch.loop_resume_context.v0",
    loopId: proposal.loopId,
    stepId: proposal.stepId,
    proposalId: proposal.id,
    sourceMode: proposal.sourceMode,
    decision,
    continuePolicy: {
      allowSameActionRetry:
        decision.type === "approve_once" || decision.type === "edit",
      requireApprovalForSimilarActions:
        decision.type === "edit" ||
        decision.type === "takeover" ||
        decision.type === "create_rule",
      maxRetries: 1
    }
  };

  if (decision.type === "edit") {
    base.userCorrection = {
      before: proposal.proposedAction.rawInput ?? proposal.proposedAction,
      after: decision.patch
    };

    if (decision.note !== undefined) {
      base.userCorrection.explanation = decision.note;
    }

    base.instructionForAgent =
      "Continue from the corrected action. Do not repeat the original unedited action unless the user explicitly approves it.";
  }

  if (decision.type === "block") {
    base.instructionForAgent = `The proposed action was blocked: ${decision.reason}. Re-plan without attempting the same side effect.`;
    base.continuePolicy.allowSameActionRetry = false;
    base.continuePolicy.requireApprovalForSimilarActions = true;
  }

  if (decision.type === "takeover") {
    base.instructionForAgent =
      decision.resumeMode === "stop_after_takeover"
        ? "The human took over and ended this loop."
        : "The human took over. Observe the current state before continuing.";
  }

  if (decision.type === "create_rule") {
    base.instructionForAgent =
      "A new rule was created from this decision. Apply the rule to similar future actions.";
  }

  return base;
}
