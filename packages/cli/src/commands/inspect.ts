import { RunStore, type LatestRun } from "@agentclutch/recorder";

export async function inspectRun(
  target = "latest",
  rootDir = ".agentclutch",
): Promise<string> {
  const store = new RunStore(rootDir);
  const runId = await resolveInspectTarget(target, store);

  if (runId === undefined) {
    return "No AgentClutch runs found under .agentclutch/runs.";
  }

  return formatInspectRun({
    runId,
    events: await store.readEvents(runId),
  });
}

export async function resolveInspectTarget(
  target: string,
  store: RunStore,
): Promise<string | undefined> {
  if (target !== "latest") {
    return target;
  }

  return (await store.readLatestRun())?.runId;
}

export function formatInspectRun(run: LatestRun): string {
  const latestCard = findLastObject(run.events, isActionCardEvent);
  const latestDecision = findLastObject(run.events, isUserDecisionEvent);
  const latestResume = findLastResumeContext(run.events);
  const lines = [`Run: ${run.runId}`, `Events: ${run.events.length}`];

  if (latestCard !== undefined) {
    const action = latestCard.proposed_action;
    lines.push(`Action Card: ${stringValue(action.label)} (${stringValue(action.kind)})`);
    lines.push(`Consequence: ${stringValue(latestCard.consequence?.label)}`);
    lines.push(`Risk: ${stringValue(latestCard.risk?.level)}`);
  }

  if (latestDecision !== undefined) {
    lines.push(`Decision: ${stringValue(latestDecision.decision)}`);
  }

  if (latestResume !== undefined) {
    lines.push(`Resume status: ${stringValue(resumeStatus(latestResume))}`);
  }

  return lines.join("\n");
}

function findLastObject<T extends Record<string, unknown>>(
  values: unknown[],
  predicate: (value: unknown) => value is T,
): T | undefined {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (predicate(value)) return value;
  }

  return undefined;
}

function isActionCardEvent(value: unknown): value is {
  type: "agentclutch.action_card.v0";
  proposed_action: { label?: unknown; kind?: unknown };
  consequence?: { label?: unknown };
  risk?: { level?: unknown };
} {
  return (
    isRecord(value) &&
    value.type === "agentclutch.action_card.v0" &&
    isRecord(value.proposed_action)
  );
}

function isUserDecisionEvent(value: unknown): value is {
  type: "agentclutch.user_decision.v0";
  decision?: unknown;
} {
  return isRecord(value) && value.type === "agentclutch.user_decision.v0";
}

function isResumeContextEvent(value: unknown): value is {
  type: "agentclutch.loop_resume_context.v0";
  status?: unknown;
  decision?: unknown;
} {
  return isRecord(value) && value.type === "agentclutch.loop_resume_context.v0";
}

function findLastResumeContext(values: unknown[]):
  | {
      type: "agentclutch.loop_resume_context.v0";
      status?: unknown;
      decision?: unknown;
    }
  | undefined {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const resumeContext = resumeContextFromEvent(values[index]);
    if (resumeContext !== undefined) return resumeContext;
  }

  return undefined;
}

function resumeContextFromEvent(value: unknown):
  | {
      type: "agentclutch.loop_resume_context.v0";
      status?: unknown;
      decision?: unknown;
    }
  | undefined {
  if (isResumeContextEvent(value)) return value;

  if (
    isRecord(value) &&
    value.type === "agentclutch.loop_event.v0" &&
    value.eventType === "resume_context.created" &&
    isResumeContextEvent(value.payload)
  ) {
    return value.payload;
  }

  return undefined;
}

function resumeStatus(resumeContext: { status?: unknown; decision?: unknown }): unknown {
  if (resumeContext.status !== undefined) return resumeContext.status;

  if (isRecord(resumeContext.decision)) {
    return resumeContext.decision.type;
  }

  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringValue(value: unknown): string {
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "unknown";
}
