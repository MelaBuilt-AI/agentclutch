import type {
  ActionCard,
  InterventionEvent,
  RunStory,
  RunStoryStep,
  UserDecision,
} from "@agentclutch/action-card";
import type {
  ActionProposal,
  AgentLoopEvent,
  ClutchDecision,
  LoopResumeContext,
} from "@agentclutch/loop";

export interface GenerateRunStoryOptions {
  createdAt?: string;
  title?: string;
}

export interface GenerateRunStoryFromJsonlOptions extends GenerateRunStoryOptions {
  runId?: string;
}

type StoryStepKind =
  | "proposal"
  | "pause"
  | "decision"
  | "resume"
  | "result"
  | "lesson";

interface CollectedStep {
  step: RunStoryStep;
  kind: StoryStepKind;
  order: number;
}

interface StoryContext {
  proposalsById: Map<string, ActionProposal>;
}

const clutchDecisionTypes = new Set<ClutchDecision["type"]>([
  "approve_once",
  "edit",
  "block",
  "takeover",
  "create_rule",
]);

export function parseRecorderEventsJsonl(jsonl: string): unknown[] {
  const events: unknown[] = [];
  const lines = jsonl.split(/\r?\n/);

  for (const [index, line] of lines.entries()) {
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      continue;
    }

    try {
      events.push(JSON.parse(trimmed) as unknown);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new SyntaxError(
        `Invalid recorder JSONL on line ${index + 1}: ${message}`,
      );
    }
  }

  return events;
}

export function generateRunStoryFromJsonl(
  jsonl: string,
  options: GenerateRunStoryFromJsonlOptions = {},
): RunStory {
  const events = parseRecorderEventsJsonl(jsonl);
  return generateRunStory(options.runId ?? inferRunId(events), events, options);
}

export function generateRunStory(
  runId: string,
  events: readonly unknown[],
  options: GenerateRunStoryOptions = {},
): RunStory {
  const context: StoryContext = {
    proposalsById: new Map(),
  };
  const collected: CollectedStep[] = [];

  for (const [index, event] of events.entries()) {
    collectSteps(event, index, context, collected);
  }

  const steps = collected
    .sort((left, right) => sortCollectedSteps(left, right))
    .map((item) => item.step);

  return {
    type: "agentclutch.run_story.v0",
    id: `story_${runId}`,
    run_id: runId,
    created_at: options.createdAt ?? new Date().toISOString(),
    title: options.title ?? `Run ${runId}`,
    summary: summarize(collected),
    steps,
  };
}

function collectSteps(
  event: unknown,
  order: number,
  context: StoryContext,
  collected: CollectedStep[],
): void {
  if (isAgentLoopEvent(event)) {
    collectLoopEventSteps(event, order, context, collected);
    return;
  }

  if (isActionProposal(event)) {
    context.proposalsById.set(event.id, event);
    collected.push({
      order,
      kind: "proposal",
      step: actionProposalStep(event, event.createdAt),
    });
    return;
  }

  if (isActionCard(event)) {
    collectActionCardSteps(event, order, context, collected);
    return;
  }

  if (isUserDecision(event)) {
    collected.push({
      order,
      kind: "decision",
      step: userDecisionStep(event),
    });
    return;
  }

  if (isLoopResumeContext(event)) {
    collected.push({
      order,
      kind: "resume",
      step: resumeContextStep(event),
    });
    return;
  }

  if (isClutchDecision(event)) {
    collected.push({
      order,
      kind: "decision",
      step: clutchDecisionStep(event),
    });
    return;
  }

  if (isInterventionEvent(event)) {
    const step = interventionStep(event);
    if (step !== undefined) {
      collected.push({ order, kind: step.kind, step: step.step });
    }
  }
}

function collectLoopEventSteps(
  event: AgentLoopEvent<unknown>,
  order: number,
  context: StoryContext,
  collected: CollectedStep[],
): void {
  const payload = event.payload;

  if (event.eventType === "action.proposed") {
    if (isActionProposal(payload)) {
      context.proposalsById.set(payload.id, payload);
      collected.push({
        order,
        kind: "proposal",
        step: actionProposalStep(payload, event.timestamp),
      });
      return;
    }

    const label = payloadSummary(payload) ?? "a consequential action";
    collected.push({
      order,
      kind: "proposal",
      step: {
        timestamp: event.timestamp,
        actor: "agent",
        text: `The agent proposed action: ${label}.`,
      },
    });
    return;
  }

  if (event.eventType === "clutch.required") {
    collected.push({
      order,
      kind: "pause",
      step: {
        timestamp: event.timestamp,
        actor: "system",
        text: "AgentClutch paused the run before a consequential action.",
      },
    });
    return;
  }

  if (event.eventType === "action_card.created") {
    if (isActionCard(payload)) {
      collectActionCardSteps(
        payload,
        order,
        context,
        collected,
        event.timestamp,
      );
      return;
    }

    collected.push({
      order,
      kind: "pause",
      step: {
        timestamp: event.timestamp,
        actor: "system",
        text: "AgentClutch paused and created an Action Card.",
      },
    });
    return;
  }

  if (event.eventType === "user.decision") {
    if (isUserDecision(payload)) {
      collected.push({
        order,
        kind: "decision",
        step: userDecisionStep(payload, event.timestamp),
      });
      return;
    }

    if (isClutchDecision(payload)) {
      collected.push({
        order,
        kind: "decision",
        step: clutchDecisionStep(payload, event.timestamp),
      });
    }
    return;
  }

  if (event.eventType === "resume_context.created") {
    if (isLoopResumeContext(payload)) {
      collected.push({
        order,
        kind: "resume",
        step: resumeContextStep(payload, event.timestamp),
      });
      return;
    }

    collected.push({
      order,
      kind: "resume",
      step: {
        timestamp: event.timestamp,
        actor: "system",
        text: "AgentClutch returned resume context to the loop.",
      },
    });
    return;
  }

  if (isLessonEvent(event.eventType)) {
    collected.push({
      order,
      kind: "lesson",
      step: lessonEventStep(event.eventType, event.timestamp, payload),
    });
    return;
  }

  if (isFinalResultEvent(event.eventType)) {
    collected.push({
      order,
      kind: "result",
      step: {
        timestamp: event.timestamp,
        actor: "system",
        text: finalResultText(event.eventType, payload),
      },
    });
  }
}

function collectActionCardSteps(
  card: ActionCard,
  order: number,
  context: StoryContext,
  collected: CollectedStep[],
  timestamp = card.created_at,
): void {
  if (!hasProposalForCard(card, context)) {
    collected.push({
      order: order - 0.1,
      kind: "proposal",
      step: {
        timestamp,
        actor: "agent",
        action_card_id: card.id,
        text: `The agent proposed action: ${card.proposed_action.label}.`,
      },
    });
  }

  collected.push({
    order,
    kind: "pause",
    step: {
      timestamp,
      actor: "system",
      action_card_id: card.id,
      text: `AgentClutch paused before ${card.proposed_action.label} because ${card.consequence.label.toLowerCase()} is ${formatReversibility(card.consequence.reversibility)}.`,
    },
  });
}

function actionProposalStep(
  proposal: ActionProposal,
  timestamp: string,
): RunStoryStep {
  const target =
    proposal.proposedAction.targetApp ?? proposal.proposedAction.targetSurface;
  return {
    timestamp,
    actor: "agent",
    text: `The agent proposed action: ${proposal.proposedAction.label} on ${target}.`,
  };
}

function userDecisionStep(
  decision: UserDecision,
  timestamp = decision.decided_at,
): RunStoryStep {
  const actor = decision.actor?.display_name ?? "The user";
  return withOptionalIds(
    {
      timestamp,
      actor: "user",
      text: userDecisionToText(decision, actor),
    },
    decision.id,
    decision.action_card_id,
  );
}

function clutchDecisionStep(
  decision: ClutchDecision,
  timestamp = decisionTimestamp(decision),
): RunStoryStep {
  return {
    timestamp,
    actor: "user",
    text: clutchDecisionToText(decision),
  };
}

function resumeContextStep(
  context: LoopResumeContext,
  timestamp = decisionTimestamp(context.decision),
): RunStoryStep {
  const instruction = context.instructionForAgent;

  if (instruction !== undefined && instruction.length > 0) {
    return {
      timestamp,
      actor: "system",
      text: `AgentClutch returned resume context: ${instruction}`,
    };
  }

  const retryText = context.continuePolicy.allowSameActionRetry
    ? "the same action can continue"
    : "the same action should not be retried";
  const approvalText = context.continuePolicy.requireApprovalForSimilarActions
    ? "similar actions require approval"
    : "similar actions do not require extra approval";

  return {
    timestamp,
    actor: "system",
    text: `AgentClutch returned resume context: ${retryText}; ${approvalText}.`,
  };
}

function interventionStep(
  event: InterventionEvent,
): { kind: StoryStepKind; step: RunStoryStep } | undefined {
  if (event.event === "pause") {
    return {
      kind: "pause",
      step: withOptionalIds(
        {
          timestamp: event.timestamp,
          actor: "system",
          text: event.summary,
        },
        undefined,
        event.action_card_id,
      ),
    };
  }

  if (event.event === "resume") {
    return {
      kind: "resume",
      step: withOptionalIds(
        {
          timestamp: event.timestamp,
          actor: "system",
          text: event.summary,
        },
        undefined,
        event.action_card_id,
      ),
    };
  }

  return undefined;
}

function userDecisionToText(decision: UserDecision, actor: string): string {
  switch (decision.decision) {
    case "approve_once":
      return `${actor} approved the action once.`;
    case "edit_fields":
      return `${actor} edited fields before allowing the agent to continue.`;
    case "accept_lesson":
      return `${actor} accepted the applied lesson.`;
    case "reject_lesson":
      return `${actor} rejected the applied lesson.`;
    case "disable_lesson":
      return `${actor} disabled the applied lesson.`;
    case "take_wheel":
      return `${actor} took the wheel and continued manually.`;
    case "block":
      return `${actor} blocked the proposed action.`;
    case "create_rule":
      return `${actor} created a reusable rule from this decision.`;
    case "request_more_context":
      return `${actor} requested more context before deciding.`;
    case "timeout":
      return "The action timed out without approval.";
  }
}

function clutchDecisionToText(decision: ClutchDecision): string {
  switch (decision.type) {
    case "approve_once":
      return `${decision.approvedBy} approved the action once.`;
    case "edit":
      return `${decision.approvedBy} edited the proposed action before continuing.`;
    case "block":
      return `${decision.blockedBy} blocked the proposed action: ${decision.reason}.`;
    case "takeover":
      return `${decision.operator} took over the run.`;
    case "create_rule":
      return `${decision.approvedBy} created a reusable rule: ${decision.rule.description}.`;
  }
}

function summarize(steps: readonly CollectedStep[]): string {
  const proposed = countKind(steps, "proposal");
  const pauses = countKind(steps, "pause");
  const decisions = countKind(steps, "decision");
  const results = countKind(steps, "result");
  const lessons = countKind(steps, "lesson");
  const resultText =
    results === 0 ? "" : ` and ${results} final result event(s)`;
  const lessonText =
    lessons === 0 ? "" : ` and ${lessons} lesson event(s)`;

  return `The run included ${proposed} proposed action(s), ${pauses} AgentClutch pause(s), ${decisions} user decision event(s)${resultText}${lessonText}.`;
}

function countKind(
  steps: readonly CollectedStep[],
  kind: StoryStepKind,
): number {
  return steps.filter((step) => step.kind === kind).length;
}

function inferRunId(events: readonly unknown[]): string {
  for (const event of events) {
    if (
      isActionCard(event) ||
      isUserDecision(event) ||
      isInterventionEvent(event)
    ) {
      return event.run_id;
    }

    if (isAgentLoopEvent(event)) {
      const payload = event.payload;
      if (
        isActionCard(payload) ||
        isUserDecision(payload) ||
        isInterventionEvent(payload)
      ) {
        return payload.run_id;
      }
    }
  }

  return "pasted_run";
}

function hasProposalForCard(card: ActionCard, context: StoryContext): boolean {
  for (const proposal of context.proposalsById.values()) {
    if (`act_${proposal.id}` === card.proposed_action.id) {
      return true;
    }

    if (proposal.proposedAction.label === card.proposed_action.label) {
      return true;
    }
  }

  return false;
}

function withOptionalIds(
  base: Pick<RunStoryStep, "timestamp" | "actor" | "text">,
  decisionId: string | undefined,
  actionCardId: string | undefined,
): RunStoryStep {
  return {
    ...base,
    ...(decisionId === undefined ? {} : { decision_id: decisionId }),
    ...(actionCardId === undefined ? {} : { action_card_id: actionCardId }),
  };
}

function formatReversibility(
  value: ActionCard["consequence"]["reversibility"],
): string {
  return value.replaceAll("_", " ");
}

function decisionTimestamp(decision: ClutchDecision): string {
  return decision.decidedAt;
}

function isFinalResultEvent(eventType: AgentLoopEvent["eventType"]): boolean {
  return (
    eventType === "action.executed" ||
    eventType === "observation.received" ||
    eventType === "loop.stopped" ||
    eventType === "loop.handoff"
  );
}

function isLessonEvent(eventType: AgentLoopEvent["eventType"]): boolean {
  return (
    eventType === "lesson.captured" ||
    eventType === "lesson.applied" ||
    eventType === "lesson.rejected" ||
    eventType === "lesson.reinforced" ||
    eventType === "lesson.disabled"
  );
}

function lessonEventStep(
  eventType: AgentLoopEvent["eventType"],
  timestamp: string,
  payload: unknown,
): RunStoryStep {
  const summary = payloadSummary(payload);

  if (summary !== undefined) {
    return {
      timestamp,
      actor: "system",
      text: summary.endsWith(".") ? summary : `${summary}.`,
    };
  }

  switch (eventType) {
    case "lesson.applied":
      return {
        timestamp,
        actor: "system",
        text: "Lesson applied to the proposed action.",
      };
    case "lesson.rejected":
      return {
        timestamp,
        actor: "system",
        text: "Lesson rejected by the user.",
      };
    case "lesson.reinforced":
      return {
        timestamp,
        actor: "system",
        text: "Lesson reinforced by the user.",
      };
    case "lesson.disabled":
      return {
        timestamp,
        actor: "system",
        text: "Lesson disabled by the user.",
      };
    case "lesson.captured":
      return {
        timestamp,
        actor: "system",
        text: "Lesson captured from a human correction.",
      };
    default:
      return {
        timestamp,
        actor: "system",
        text: "Lesson event recorded.",
      };
  }
}

function finalResultText(
  eventType: AgentLoopEvent["eventType"],
  payload: unknown,
): string {
  const summary = payloadSummary(payload);

  if (summary !== undefined) {
    return `Final result: ${summary}.`;
  }

  switch (eventType) {
    case "action.executed":
      return "Final result: the approved action executed.";
    case "observation.received":
      return "Final result: the agent received an observation.";
    case "loop.handoff":
      return "Final result: the loop handed off to a human operator.";
    case "loop.stopped":
      return "Final result: the loop stopped.";
    default:
      return "Final result recorded.";
  }
}

function payloadSummary(payload: unknown): string | undefined {
  if (typeof payload === "string" && payload.length > 0) {
    return payload;
  }

  if (typeof payload === "number" || typeof payload === "boolean") {
    return String(payload);
  }

  if (!isRecord(payload)) {
    return undefined;
  }

  for (const key of [
    "summary",
    "result",
    "message",
    "status",
    "observation",
    "output",
  ]) {
    const value = payload[key];
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
  }

  return undefined;
}

function sortCollectedSteps(left: CollectedStep, right: CollectedStep): number {
  const byTimestamp = left.step.timestamp.localeCompare(right.step.timestamp);
  if (byTimestamp !== 0) {
    return byTimestamp;
  }

  return left.order - right.order;
}

function isActionProposal(value: unknown): value is ActionProposal {
  return (
    isRecord(value) &&
    value.type === "agentclutch.action_proposal.v0" &&
    typeof value.id === "string" &&
    typeof value.createdAt === "string" &&
    isRecord(value.proposedAction) &&
    typeof value.proposedAction.label === "string" &&
    typeof value.proposedAction.targetSurface === "string"
  );
}

function isActionCard(value: unknown): value is ActionCard {
  return (
    isRecord(value) &&
    value.type === "agentclutch.action_card.v0" &&
    typeof value.id === "string" &&
    typeof value.run_id === "string" &&
    typeof value.created_at === "string" &&
    isRecord(value.proposed_action) &&
    typeof value.proposed_action.id === "string" &&
    typeof value.proposed_action.label === "string" &&
    isRecord(value.consequence) &&
    typeof value.consequence.label === "string" &&
    typeof value.consequence.reversibility === "string"
  );
}

function isUserDecision(value: unknown): value is UserDecision {
  return (
    isRecord(value) &&
    value.type === "agentclutch.user_decision.v0" &&
    typeof value.id === "string" &&
    typeof value.action_card_id === "string" &&
    typeof value.run_id === "string" &&
    typeof value.decided_at === "string" &&
    typeof value.decision === "string"
  );
}

function isInterventionEvent(value: unknown): value is InterventionEvent {
  return (
    isRecord(value) &&
    value.type === "agentclutch.intervention_event.v0" &&
    typeof value.id === "string" &&
    typeof value.run_id === "string" &&
    typeof value.timestamp === "string" &&
    typeof value.event === "string" &&
    typeof value.summary === "string"
  );
}

function isLoopResumeContext(value: unknown): value is LoopResumeContext {
  return (
    isRecord(value) &&
    value.type === "agentclutch.loop_resume_context.v0" &&
    typeof value.loopId === "string" &&
    typeof value.stepId === "string" &&
    typeof value.proposalId === "string" &&
    isClutchDecision(value.decision) &&
    isRecord(value.continuePolicy) &&
    typeof value.continuePolicy.allowSameActionRetry === "boolean" &&
    typeof value.continuePolicy.requireApprovalForSimilarActions === "boolean"
  );
}

function isClutchDecision(value: unknown): value is ClutchDecision {
  return (
    isRecord(value) &&
    typeof value.type === "string" &&
    clutchDecisionTypes.has(value.type as ClutchDecision["type"]) &&
    typeof decisionTimestampCandidate(value) === "string"
  );
}

function decisionTimestampCandidate(value: Record<string, unknown>): unknown {
  return value.decidedAt;
}

function isAgentLoopEvent(value: unknown): value is AgentLoopEvent<unknown> {
  return (
    isRecord(value) &&
    value.type === "agentclutch.loop_event.v0" &&
    typeof value.id === "string" &&
    typeof value.loopId === "string" &&
    typeof value.eventType === "string" &&
    typeof value.timestamp === "string" &&
    "payload" in value
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
