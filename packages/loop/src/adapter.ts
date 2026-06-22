import type {
  ActionProposal,
  ClutchDecision,
  LoopResumeContext
} from "./types.js";

export interface TakeoverSession {
  loopId: string;
  startedAt: string;
  operator: string;
  mode: "browser" | "desktop" | "terminal" | "custom";
}

export interface ClutchControls {
  requireClutch(proposal: ActionProposal): Promise<ClutchDecision>;
  buildResumeContext(
    proposal: ActionProposal,
    decision: ClutchDecision
  ): LoopResumeContext;
}

export interface AgentLoopAdapter {
  runtime: string;

  onActionProposed(
    proposal: ActionProposal,
    controls: ClutchControls
  ): Promise<ClutchDecision>;

  pause(loopId: string): Promise<void>;

  resume(loopId: string, resumeContext: LoopResumeContext): Promise<void>;

  takeover(loopId: string): Promise<TakeoverSession>;

  stop(loopId: string, reason?: string): Promise<void>;
}
