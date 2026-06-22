import {
  buildActionCard,
  type ActionCard,
  type ActionSurface,
  type ChangedField,
  type EvidenceItem as ActionCardEvidenceItem,
  type JsonObject,
  type JsonValue
} from "@agentclutch/action-card";
import {
  buildResumeContext,
  type AgentLoopEventType,
  normalizeActionProposal,
  type ActionProposal,
  type ActionProposalInput,
  type ClutchDecision,
  type LoopResumeContext
} from "@agentclutch/loop";
import { classifyConsequence } from "./consequence.js";
import { createId } from "./ids.js";
import {
  appliedLessonsFromActionCardMetadata,
  applyLessonsToProposal,
  captureLessonsFromEdit,
  lessonSummary,
  loadLessons,
  saveLessons,
  updateLessonsAfterDecision,
  upsertLessons,
  type AppliedLesson,
  type Lesson,
} from "./lessons.js";
import { riskFromConsequence } from "./risk.js";

export interface ClutchDecisionResult {
  proposal: ActionProposal;
  card: ActionCard;
  decision: ClutchDecision;
  resumeContext: LoopResumeContext;
  appliedLessons: AppliedLesson[];
}

export interface DecisionRenderer {
  /**
   * Environment-specific renderer. Tests can provide a deterministic fake.
   */
  decide(proposal: ActionProposal, card?: ActionCard): Promise<ClutchDecision>;
}

export interface ClutchRecorderLike {
  record(event: unknown): Promise<void>;
}

export interface CreateClutchOptions {
  renderer: DecisionRenderer;
  recorder?: ClutchRecorderLike;
  runId?: string;
  lessonsRootDir?: string;
}

export interface ConfirmActionInput
  extends Omit<ActionProposalInput, "sourceMode"> {
  sourceMode?: "prompt_guard";
}

export interface WrapToolOptions<TArgs extends unknown[]> {
  kind: string;
  label: string;
  targetSurface: string;
  targetApp?: string;
  risk?: ActionProposalInput["riskHints"];
  buildVisibleContext?: (...args: TArgs) => ActionProposalInput["visibleContext"];
  buildEvidence?: (...args: TArgs) => ActionProposalInput["evidence"];
  buildUserGoal?: (...args: TArgs) => ActionProposalInput["userGoal"];
}

export interface ClutchFacade {
  confirmAction(input: ConfirmActionInput): Promise<ClutchDecisionResult>;
  wrapTool<TArgs extends unknown[], TResult>(
    tool: (...args: TArgs) => Promise<TResult>,
    toolOptions: WrapToolOptions<TArgs>
  ): (...args: TArgs) => Promise<TResult | undefined>;
  onActionProposed(
    input: ActionProposalInput | ActionProposal
  ): Promise<ClutchDecisionResult>;
}

export function createClutch(options: CreateClutchOptions): ClutchFacade {
  const runId = options.runId ?? createId("run");

  async function decide(input: ActionProposalInput): Promise<ClutchDecisionResult> {
    const lessonState = await applyStoredLessons(
      normalizeActionProposal(input),
      options,
    );
    const proposal = lessonState.proposal;
    const card = actionCardFromProposal(proposal, runId);
    const appliedLessons = appliedLessonsFromActionCardMetadata(card.metadata);

    await recordLoopEvent(options, proposal, "action.proposed", proposal);
    for (const lesson of appliedLessons) {
      await recordLoopEvent(options, proposal, "lesson.applied", {
        lesson,
        summary: `Lesson applied: ${lessonSummary(lesson)}`,
      });
    }
    await options.recorder?.record(card);

    const decision = await options.renderer.decide(proposal, card);

    await recordLoopEvent(options, proposal, "user.decision", decision);
    await persistLessonDecision(options, proposal, lessonState.lessons, {
      decision,
      appliedLessons,
    });

    const resumeContext = buildResumeContext(proposal, decision);

    await recordLoopEvent(
      options,
      proposal,
      "resume_context.created",
      resumeContext
    );

    return { proposal, card, decision, resumeContext, appliedLessons };
  }

  return {
    confirmAction(input: ConfirmActionInput): Promise<ClutchDecisionResult> {
      return decide({
        ...input,
        sourceMode: "prompt_guard"
      });
    },

    wrapTool<TArgs extends unknown[], TResult>(
      tool: (...args: TArgs) => Promise<TResult>,
      toolOptions: WrapToolOptions<TArgs>
    ) {
      return async (...args: TArgs): Promise<TResult | undefined> => {
        const input: ActionProposalInput = {
          sourceMode: "tool_wrapper",
          proposedAction: {
            kind: toolOptions.kind,
            label: toolOptions.label,
            targetSurface: toolOptions.targetSurface,
            rawInput: args
          }
        };

        if (toolOptions.targetApp !== undefined) {
          input.proposedAction.targetApp = toolOptions.targetApp;
        }

        const userGoal = toolOptions.buildUserGoal?.(...args);
        if (userGoal !== undefined) {
          input.userGoal = userGoal;
        }

        const visibleContext = toolOptions.buildVisibleContext?.(...args);
        if (visibleContext !== undefined) {
          input.visibleContext = visibleContext;
        }

        const evidence = toolOptions.buildEvidence?.(...args);
        if (evidence !== undefined) {
          input.evidence = evidence;
        }

        if (toolOptions.risk !== undefined) {
          input.riskHints = toolOptions.risk;
        }

        const { decision } = await decide(input);

        if (decision.type === "approve_once") {
          return tool(...args);
        }

        if (decision.type === "edit") {
          throw new Error(
            "MVP wrapTool edit decisions require a caller-provided patch executor."
          );
        }

        return undefined;
      };
    },

    onActionProposed(
      input: ActionProposalInput | ActionProposal
    ): Promise<ClutchDecisionResult> {
      return decide({
        ...input,
        sourceMode: input.sourceMode ?? "loop_native"
      });
    }
  };
}

export function confirmAction(
  input: ConfirmActionInput,
  options: CreateClutchOptions
): Promise<ClutchDecisionResult> {
  return createClutch(options).confirmAction(input);
}

function actionCardFromProposal(
  proposal: ActionProposal,
  runId: string
): ActionCard {
  const buttonText = String(proposal.visibleContext?.fields?.buttonText ?? "");
  const consequence = classifyConsequence({
    kind: proposal.proposedAction.kind,
    label: proposal.proposedAction.label,
    buttonText,
    ...(proposal.visibleContext?.url === undefined
      ? {}
      : { url: proposal.visibleContext.url })
  });
  const risk = riskFromConsequence(consequence);
  const fields = changedFieldsFromProposal(proposal);
  const metadata = isJsonObject(proposal.metadata)
    ? proposal.metadata
    : undefined;

  return buildActionCard({
    id: createId("acard"),
    run_id: runId,
    agent: {
      name: proposal.agent.name ?? "agentclutch-agent",
      ...(proposal.agent.id === undefined ? {} : { id: proposal.agent.id }),
      runtime: proposal.agent.runtime,
      ...(proposal.agent.version === undefined
        ? {}
        : { version: proposal.agent.version }),
      ...(proposal.agent.model === undefined ? {} : { model: proposal.agent.model })
    },
    proposed_action: {
      id: `act_${proposal.id}`,
      kind: proposal.proposedAction.kind,
      label: proposal.proposedAction.label,
      ...(proposal.loopContext.whyNow === undefined
        ? {}
        : { description: proposal.loopContext.whyNow }),
      surface: toActionSurface(proposal.proposedAction.targetSurface),
      target: {
        surface: toActionSurface(proposal.proposedAction.targetSurface),
        ...(proposal.proposedAction.targetApp === undefined
          ? {}
          : { target_app: proposal.proposedAction.targetApp }),
        ...(proposal.visibleContext?.url === undefined
          ? {}
          : { url: proposal.visibleContext.url }),
        ...(proposal.visibleContext?.pageTitle === undefined
          ? {}
          : { page_title: proposal.visibleContext.pageTitle }),
        ...(proposal.visibleContext?.highlightedSelector === undefined
          ? {}
          : { selector: proposal.visibleContext.highlightedSelector }),
        ...(buttonText === "" ? {} : { button_text: buttonText })
      },
      ...(fields === undefined ? {} : { changed_fields: fields }),
      ...(isJsonObject(proposal.proposedAction.rawInput)
        ? { raw: proposal.proposedAction.rawInput }
        : {})
    },
    consequence,
    risk,
    evidence: proposal.evidence.map(actionCardEvidence),
    user_options: actionCardUserOptions(proposal),
    ...(metadata === undefined ? {} : { metadata })
  });
}

async function applyStoredLessons(
  proposal: ActionProposal,
  options: CreateClutchOptions,
): Promise<{ proposal: ActionProposal; lessons: Lesson[] }> {
  const lessons = await loadLessons(options.lessonsRootDir);
  const result = applyLessonsToProposal(proposal, lessons);

  return {
    proposal: result.proposal,
    lessons,
  };
}

async function persistLessonDecision(
  options: CreateClutchOptions,
  proposal: ActionProposal,
  existingLessons: readonly Lesson[],
  result: {
    decision: ClutchDecision;
    appliedLessons: readonly AppliedLesson[];
  },
): Promise<void> {
  let lessons = [...existingLessons];

  if (
    result.appliedLessons.length > 0 &&
    result.decision.type === "approve_once"
  ) {
    lessons = updateLessonsAfterDecision(
      lessons,
      result.appliedLessons,
      "accepted",
    );
    await saveLessons(lessons, options.lessonsRootDir);

    for (const lesson of result.appliedLessons) {
      await recordLoopEvent(options, proposal, "lesson.reinforced", {
        lesson,
        summary: `Lesson reinforced: ${lessonSummary(lesson)}`,
      });
    }
  }

  if (result.decision.type === "edit") {
    const candidates = captureLessonsFromEdit(proposal, result.decision);

    if (candidates.length === 0) return;

    lessons = upsertLessons(lessons, candidates);
    await saveLessons(lessons, options.lessonsRootDir);

    for (const lesson of candidates) {
      await recordLoopEvent(options, proposal, "lesson.captured", {
        lesson,
        summary: `Lesson captured: ${lessonSummary(lesson)}`,
      });
    }
  }
}

function actionCardUserOptions(proposal: ActionProposal): ActionCard["user_options"] {
  const base: ActionCard["user_options"] = [
    "approve_once",
    "edit_fields",
    "take_wheel",
    "block",
  ];
  const appliedLessons = proposal.metadata?.["applied_lessons"];

  if (!Array.isArray(appliedLessons) || appliedLessons.length === 0) {
    return base;
  }

  return ["accept_lesson", "reject_lesson", "disable_lesson", ...base];
}

function changedFields(fields: Record<string, unknown>): ChangedField[] {
  return Object.entries(fields).map(([field, after]) => ({
    field,
    after: toJsonValue(after),
    editable: true
  }));
}

function changedFieldsFromProposal(
  proposal: ActionProposal,
): ChangedField[] | undefined {
  const metadataFields = changedFieldsFromUnknown(
    proposal.metadata?.["changedFields"],
  );
  if (metadataFields !== undefined) return metadataFields;

  const rawInput = proposal.proposedAction.rawInput;
  if (isRecord(rawInput)) {
    const rawFields = changedFieldsFromUnknown(rawInput["changedFields"]);
    if (rawFields !== undefined) return rawFields;
  }

  return proposal.visibleContext?.fields === undefined
    ? undefined
    : changedFields(proposal.visibleContext.fields);
}

function changedFieldsFromUnknown(value: unknown): ChangedField[] | undefined {
  if (!Array.isArray(value)) return undefined;

  const fields = value.filter(isChangedField);
  return fields.length === 0 ? undefined : fields;
}

function isChangedField(value: unknown): value is ChangedField {
  return (
    isJsonObject(value) &&
    typeof value["field"] === "string" &&
    "after" in value
  );
}

function actionCardEvidence(
  item: ActionProposal["evidence"][number],
  index: number
): ActionCardEvidenceItem {
  const isLessonEvidence =
    item.label === "Applied Lesson" || item.source.startsWith("lesson:");

  return {
    id: `ev_${index + 1}`,
    label: item.label,
    source_type: isLessonEvidence ? "memory" : "tool_output",
    source_ref: item.source,
    ...(item.summary === undefined ? {} : { summary: item.summary }),
    ...(item.hash === undefined ? {} : { hash: item.hash })
  };
}

function recordLoopEvent(
  options: CreateClutchOptions,
  proposal: ActionProposal,
  eventType: AgentLoopEventType,
  payload: unknown
): Promise<void> | undefined {
  return options.recorder?.record({
    type: "agentclutch.loop_event.v0",
    id: createId("evt"),
    loopId: proposal.loopId,
    stepId: proposal.stepId,
    eventType,
    timestamp: new Date().toISOString(),
    payload
  });
}

function toActionSurface(surface: string): ActionSurface {
  const known = [
    "browser",
    "desktop",
    "filesystem",
    "shell",
    "mcp",
    "email",
    "chat",
    "github",
    "calendar",
    "payment",
    "saas",
    "endpoint",
    "unknown"
  ] as const;

  return known.includes(surface as ActionSurface)
    ? (surface as ActionSurface)
    : "unknown";
}

function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every(isJsonValue)
  );
}

function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  return isJsonObject(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toJsonValue(value: unknown): ChangedField["after"] {
  return isJsonValue(value) ? value : String(value);
}
