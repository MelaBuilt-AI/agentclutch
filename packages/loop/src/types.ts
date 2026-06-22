export type AgentClutchIntegrationMode =
  | "prompt_guard"
  | "tool_wrapper"
  | "loop_native";

export type AgentRuntime =
  | "playwright"
  | "browser-use"
  | "mcp"
  | "cli"
  | "desktop"
  | "openai-agents"
  | "langgraph"
  | "custom";

export type ProposedActionKind =
  | "browser.click"
  | "browser.form_submit"
  | "browser.checkout"
  | "mcp.tool_call"
  | "email.send"
  | "chat.post"
  | "file.write"
  | "file.delete"
  | "shell.exec"
  | "github.write"
  | "calendar.book"
  | "payment.checkout"
  | "saas.write"
  | "endpoint.change"
  | "custom";

export type Reversibility =
  | "clean"
  | "compensable"
  | "residue"
  | "not_reversible"
  | "unknown";

export type BlastRadius =
  | "none"
  | "single_user"
  | "team"
  | "customer"
  | "organization"
  | "external"
  | "public"
  | "production";

export interface AgentDescriptor {
  id?: string;
  name?: string;
  runtime: AgentRuntime;
  model?: string;
  version?: string;
}

export interface UserGoalDescriptor {
  summary?: string;
  original?: string;
}

export interface ProposedActionDescriptor {
  kind: ProposedActionKind | string;
  label: string;
  targetSurface: string;
  targetApp?: string;
  targetIdentifier?: string;
  rawInput?: unknown;
}

export interface VisibleContext {
  pageTitle?: string;
  url?: string;
  selectedText?: string;
  highlightedSelector?: string;
  fields?: Record<string, unknown>;
  screenshotRef?: string;
}

export interface LoopContextInput {
  previousStepIds?: string[];
  planSummary?: string;
  whyNow?: string;
  confidence?: number;
}

export interface LoopContext {
  previousStepIds: string[];
  planSummary?: string;
  whyNow?: string;
  confidence?: number;
}

export interface RiskHints {
  reversibility?: Reversibility;
  blastRadius?: BlastRadius;
  requiresApproval?: boolean;
}

export interface EvidenceItem {
  label: string;
  source: string;
  summary?: string;
  hash?: string;
}

export interface ActionProposalInput {
  type?: "agentclutch.action_proposal.v0";

  /**
   * Progressive adoption mode.
   * - prompt_guard: prompt-driven app about to execute one side effect
   * - tool_wrapper: wrapper around a tool/API/browser/shell/MCP action
   * - loop_native: explicit engineered agent loop
   */
  sourceMode: AgentClutchIntegrationMode;

  /**
   * Optional for prompt_guard and tool_wrapper.
   * Required by convention for loop_native, but normalized if omitted.
   */
  id?: string;
  loopId?: string;
  stepId?: string;
  createdAt?: string;

  agent?: AgentDescriptor;
  userGoal?: UserGoalDescriptor;
  proposedAction: ProposedActionDescriptor;
  visibleContext?: VisibleContext;
  loopContext?: LoopContextInput;
  riskHints?: RiskHints;
  evidence?: EvidenceItem[];
  metadata?: Record<string, unknown>;
}

export interface ActionProposal
  extends Omit<
    ActionProposalInput,
    | "type"
    | "id"
    | "loopId"
    | "stepId"
    | "createdAt"
    | "loopContext"
    | "agent"
    | "evidence"
  > {
  type: "agentclutch.action_proposal.v0";
  id: string;
  loopId: string;
  stepId: string;
  createdAt: string;
  agent: AgentDescriptor;
  loopContext: LoopContext;
  evidence: EvidenceItem[];
}

export type ActionPatchOperation = "replace" | "add" | "remove";

export interface ActionPatch {
  op: ActionPatchOperation;
  path: string;
  from?: unknown;
  value?: unknown;
  reason?: string;
}

export interface ClutchRule {
  id: string;
  description: string;
  match: Record<string, unknown>;
  decision: "allow" | "require_clutch" | "block";
}

export type ClutchDecision =
  | {
      type: "approve_once";
      approvedBy: string;
      decidedAt: string;
      note?: string;
    }
  | {
      type: "edit";
      approvedBy: string;
      decidedAt: string;
      patch: ActionPatch[];
      note?: string;
    }
  | {
      type: "block";
      blockedBy: string;
      decidedAt: string;
      reason: string;
    }
  | {
      type: "takeover";
      operator: string;
      decidedAt: string;
      resumeMode:
        | "resume_from_current_state"
        | "resume_with_new_instruction"
        | "stop_after_takeover";
      note?: string;
    }
  | {
      type: "create_rule";
      approvedBy: string;
      decidedAt: string;
      rule: ClutchRule;
      note?: string;
    };

export interface LoopResumeContext {
  type: "agentclutch.loop_resume_context.v0";
  loopId: string;
  stepId: string;
  proposalId: string;
  sourceMode: AgentClutchIntegrationMode;
  decision: ClutchDecision;

  userCorrection?: {
    before: unknown;
    after: unknown;
    explanation?: string;
  };

  updatedConstraints?: string[];
  instructionForAgent?: string;

  continuePolicy: {
    allowSameActionRetry: boolean;
    requireApprovalForSimilarActions: boolean;
    maxRetries?: number;
  };
}
