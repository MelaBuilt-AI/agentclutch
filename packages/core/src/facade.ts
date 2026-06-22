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
  normalizeActionProposal,
  type ActionProposal,
  type ActionProposalInput,
  type ClutchDecision,
  type LoopResumeContext
} from "@agentclutch/loop";
import { classifyConsequence } from "./consequence.js";
import { createId } from "./ids.js";
import { riskFromConsequence } from "./risk.js";

export interface ClutchDecisionResult {
  proposal: ActionProposal;
  card: ActionCard;
  decision: ClutchDecision;
  resumeContext: LoopResumeContext;
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
    const proposal = normalizeActionProposal(input);
    const card = actionCardFromProposal(proposal, runId);

    await recordLoopEvent(options, proposal, "action.proposed", proposal);
    await options.recorder?.record(card);

    const decision = await options.renderer.decide(proposal, card);
    const resumeContext = buildResumeContext(proposal, decision);

    await recordLoopEvent(options, proposal, "user.decision", decision);
    await recordLoopEvent(
      options,
      proposal,
      "resume_context.created",
      resumeContext
    );

    return { proposal, card, decision, resumeContext };
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
  const fields = proposal.visibleContext?.fields;

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
      ...(fields === undefined ? {} : { changed_fields: changedFields(fields) }),
      ...(isJsonObject(proposal.proposedAction.rawInput)
        ? { raw: proposal.proposedAction.rawInput }
        : {})
    },
    consequence,
    risk,
    evidence: proposal.evidence.map(actionCardEvidence)
  });
}

function changedFields(fields: Record<string, unknown>): ChangedField[] {
  return Object.entries(fields).map(([field, after]) => ({
    field,
    after: toJsonValue(after),
    editable: true
  }));
}

function actionCardEvidence(
  item: ActionProposal["evidence"][number],
  index: number
): ActionCardEvidenceItem {
  return {
    id: `ev_${index + 1}`,
    label: item.label,
    source_type: "tool_output",
    source_ref: item.source,
    ...(item.summary === undefined ? {} : { summary: item.summary }),
    ...(item.hash === undefined ? {} : { hash: item.hash })
  };
}

function recordLoopEvent(
  options: CreateClutchOptions,
  proposal: ActionProposal,
  eventType: "action.proposed" | "user.decision" | "resume_context.created",
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

function toJsonValue(value: unknown): ChangedField["after"] {
  return isJsonValue(value) ? value : String(value);
}
