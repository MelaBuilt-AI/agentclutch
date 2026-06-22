export type AgentLoopEventType =
  | "goal.received"
  | "perception.captured"
  | "state.updated"
  | "plan.created"
  | "action.proposed"
  | "clutch.required"
  | "action_card.created"
  | "user.decision"
  | "resume_context.created"
  | "action.executed"
  | "observation.received"
  | "loop.resumed"
  | "loop.stopped"
  | "loop.handoff"
  | "lesson.captured";

export interface AgentLoopEvent<TPayload = unknown> {
  type: "agentclutch.loop_event.v0";
  id: string;
  loopId: string;
  stepId?: string;
  eventType: AgentLoopEventType;
  timestamp: string;
  payload: TPayload;
}
