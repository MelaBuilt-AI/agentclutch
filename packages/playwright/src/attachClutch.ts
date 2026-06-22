import type {
  ActionCard,
  BoundingBox,
  ChangedField,
  EvidenceItem as ActionCardEvidenceItem,
  JsonObject,
  JsonValue,
  ProposedAction,
  UserDecision
} from "@agentclutch/action-card";
import { buildActionCard } from "@agentclutch/action-card";
import {
  classifyConsequence,
  createId,
  riskFromConsequence
} from "@agentclutch/core";
import type {
  ActionProposal,
  ActionProposalInput,
  ClutchDecision,
  LoopResumeContext
} from "@agentclutch/loop";
import { buildResumeContext, normalizeActionProposal } from "@agentclutch/loop";
import type { JsonlRecorder } from "@agentclutch/recorder";
import type { Locator, Page } from "playwright";
import { browserOverlayScript } from "./browserOverlay.js";

export interface ClutchRecorder {
  record(event: unknown): Promise<void> | void;
}

export interface AttachClutchOptions {
  runId?: string;
  agentName?: string;
  agentModel?: string;
  recorder?: ClutchRecorder | Pick<JsonlRecorder, "record">;
}

export interface BrowserActionOptions {
  kind?: string;
  label?: string;
  description?: string;
  targetApp?: string;
  changedFields?: ChangedField[];
  evidence?: ActionCardEvidenceItem[];
  userGoal?: ActionProposalInput["userGoal"];
  loopId?: string;
  stepId?: string;
  loopContext?: ActionProposalInput["loopContext"];
  riskHints?: ActionProposalInput["riskHints"];
  metadata?: Record<string, unknown>;
}

export interface ProposedDecisionResult {
  proposal: ActionProposal;
  card: ActionCard;
  userDecision: UserDecision;
  decision: ClutchDecision;
  resumeContext: LoopResumeContext;
  executed: boolean;
}

export interface ClutchPlaywright {
  click(
    selector: string,
    options?: BrowserActionOptions
  ): Promise<ProposedDecisionResult>;
  submit(
    selector: string,
    options?: BrowserActionOptions
  ): Promise<ProposedDecisionResult>;
  propose(input: ActionProposalInput): Promise<ProposedDecisionResult>;
}

export async function attachClutch(
  page: Page,
  options: AttachClutchOptions = {}
): Promise<ClutchPlaywright> {
  const runId = options.runId ?? createId("run");
  const overlayScript = browserOverlayScript();

  await page.addInitScript(overlayScript);
  await page.evaluate(overlayScript);

  async function propose(
    input: ActionProposalInput
  ): Promise<ProposedDecisionResult> {
    const proposal = normalizeActionProposal(input);

    await record(options.recorder, loopEvent(proposal, "action.proposed", proposal));

    const card = actionCardFromProposal(proposal, runId);
    await record(options.recorder, card);

    const userDecision = await showActionCard(page, card);
    await record(options.recorder, userDecision);

    const decision = userDecisionToClutchDecision(userDecision);
    const resumeContext = buildResumeContext(proposal, decision);

    await record(
      options.recorder,
      loopEvent(proposal, "resume_context.created", resumeContext)
    );

    return {
      proposal,
      card,
      userDecision,
      decision,
      resumeContext,
      executed: false
    };
  }

  return {
    async click(selector, actionOptions) {
      const result = await propose(
        await browserActionProposalInput(page, selector, "click", options, actionOptions)
      );

      if (result.decision.type === "approve_once") {
        await page.locator(selector).first().click();
        result.executed = true;
      }

      return result;
    },

    async submit(selector, actionOptions) {
      const result = await propose(
        await browserActionProposalInput(page, selector, "submit", options, {
          ...actionOptions,
          kind: actionOptions?.kind ?? "browser.form_submit"
        })
      );

      if (result.decision.type === "approve_once") {
        await submitElement(page.locator(selector).first());
        result.executed = true;
      }

      return result;
    },

    propose
  };
}

async function showActionCard(
  page: Page,
  card: ActionCard
): Promise<UserDecision> {
  const decision = await page.evaluate(async (actionCard: unknown) => {
    if (!window.__agentclutchShowActionCard) {
      throw new Error("AgentClutch browser overlay was not installed.");
    }

    return window.__agentclutchShowActionCard(actionCard as ActionCard);
  }, card as unknown);

  return decision as UserDecision;
}

async function browserActionProposalInput(
  page: Page,
  selector: string,
  action: "click" | "submit",
  attachOptions: AttachClutchOptions,
  actionOptions: BrowserActionOptions = {}
): Promise<ActionProposalInput> {
  const locator = page.locator(selector).first();
  const target = await inspectTarget(page, locator);
  const visibleLabel = target.buttonText ?? target.ariaLabel ?? selector;
  const kind =
    actionOptions.kind ??
    (action === "submit" ? "browser.form_submit" : inferKindFromText(visibleLabel));
  const label =
    actionOptions.label ??
    (action === "submit" && visibleLabel === selector
      ? "Submit form"
      : visibleLabel);

  const metadata = browserActionMetadata(actionOptions);

  const input: ActionProposalInput = {
    sourceMode: "tool_wrapper",
    ...(actionOptions.loopId === undefined ? {} : { loopId: actionOptions.loopId }),
    ...(actionOptions.stepId === undefined ? {} : { stepId: actionOptions.stepId }),
    agent: {
      name: attachOptions.agentName ?? "playwright-agent",
      runtime: "playwright",
      ...(attachOptions.agentModel === undefined
        ? {}
        : { model: attachOptions.agentModel })
    },
    ...(actionOptions.userGoal === undefined
      ? {}
      : { userGoal: actionOptions.userGoal }),
    proposedAction: {
      kind,
      label,
      targetSurface: "browser",
      ...(actionOptions.targetApp === undefined
        ? {}
        : { targetApp: actionOptions.targetApp }),
      targetIdentifier: selector,
      rawInput: {
        selector,
        action,
        kind,
        label
      }
    },
    visibleContext: {
      pageTitle: target.pageTitle,
      url: target.url,
      highlightedSelector: selector,
      fields: {
        selector,
        action,
        tagName: target.tagName,
        buttonText: target.buttonText,
        ariaLabel: target.ariaLabel,
        boundingBox: target.boundingBox
      }
    },
    loopContext: {
      ...actionOptions.loopContext,
      ...(actionOptions.description === undefined
        ? {}
        : { whyNow: actionOptions.description })
    },
    riskHints: {
      requiresApproval: true,
      ...actionOptions.riskHints
    },
    ...(actionOptions.evidence === undefined
      ? {}
      : {
          evidence: actionOptions.evidence.map((item) => ({
            label: item.label,
            source: item.source_ref ?? item.source_type,
            ...(item.summary === undefined ? {} : { summary: item.summary }),
            ...(item.hash === undefined ? {} : { hash: item.hash })
          }))
        }),
    ...(metadata === undefined ? {} : { metadata })
  };

  return input;
}

interface TargetInspection {
  pageTitle: string;
  url: string;
  tagName?: string;
  buttonText?: string;
  ariaLabel?: string;
  boundingBox?: BoundingBox;
}

async function inspectTarget(
  page: Page,
  locator: Locator
): Promise<TargetInspection> {
  const [pageTitle, url, tagName, buttonText, ariaLabel, boundingBox] =
    await Promise.all([
      page.title().catch(() => ""),
      Promise.resolve(page.url()),
      locator
        .evaluate((element) => element.tagName.toLowerCase())
        .catch(() => undefined),
      locator
        .innerText({ timeout: 750 })
        .then((text) => text.trim())
        .catch(() => undefined),
      locator.getAttribute("aria-label").catch(() => undefined),
      locator.boundingBox().catch(() => undefined)
    ]);

  return {
    pageTitle,
    url,
    ...(tagName === undefined ? {} : { tagName }),
    ...(buttonText === undefined || buttonText === ""
      ? {}
      : { buttonText }),
    ...(ariaLabel === undefined || ariaLabel === null
      ? {}
      : { ariaLabel }),
    ...(boundingBox === undefined || boundingBox === null
      ? {}
      : { boundingBox })
  };
}

function actionCardFromProposal(
  proposal: ActionProposal,
  runId: string
): ActionCard {
  const buttonText = getStringField(proposal.visibleContext?.fields, "buttonText");
  const ariaLabel = getStringField(proposal.visibleContext?.fields, "ariaLabel");
  const boundingBox = getBoundingBoxField(
    proposal.visibleContext?.fields,
    "boundingBox"
  );
  const raw = toJsonObject(proposal.proposedAction.rawInput);
  const changedFields = getChangedFields(proposal.metadata);
  const consequence = classifyConsequence({
    kind: proposal.proposedAction.kind,
    label: proposal.proposedAction.label,
    ...(buttonText === undefined ? {} : { buttonText }),
    ...(proposal.visibleContext?.url === undefined
      ? {}
      : { url: proposal.visibleContext.url })
  });
  const proposedAction: ProposedAction = {
    id: createId("act"),
    kind: proposal.proposedAction.kind,
    label: proposal.proposedAction.label,
    description:
      proposal.loopContext.whyNow ??
      proposal.loopContext.planSummary ??
      proposal.proposedAction.label,
    surface: "browser",
    target: {
      surface: "browser",
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
      ...(buttonText === undefined ? {} : { button_text: buttonText }),
      ...(ariaLabel === undefined ? {} : { aria_label: ariaLabel }),
      ...(boundingBox === undefined ? {} : { bounding_box: boundingBox })
    },
    ...(changedFields === undefined ? {} : { changed_fields: changedFields }),
    ...(raw === undefined ? {} : { raw })
  };

  return buildActionCard({
    id: createId("acard"),
    run_id: runId,
    agent: {
      ...(proposal.agent.id === undefined ? {} : { id: proposal.agent.id }),
      name: proposal.agent.name ?? "playwright-agent",
      runtime: proposal.agent.runtime,
      ...(proposal.agent.version === undefined
        ? {}
        : { version: proposal.agent.version }),
      ...(proposal.agent.model === undefined ? {} : { model: proposal.agent.model })
    },
    proposed_action: proposedAction,
    consequence,
    risk: riskFromConsequence(consequence),
    evidence: proposal.evidence.map((item) => ({
      id: createId("ev"),
      label: item.label,
      source_type: "tool_output",
      source_ref: item.source,
      ...(item.summary === undefined ? {} : { summary: item.summary }),
      ...(item.hash === undefined ? {} : { hash: item.hash })
    })),
    user_options: [
      "approve_once",
      "edit_fields",
      "take_wheel",
      "block",
      "create_rule"
    ]
  });
}

function userDecisionToClutchDecision(decision: UserDecision): ClutchDecision {
  const actor = decision.actor?.display_name ?? "local-user";

  switch (decision.decision) {
    case "approve_once":
      return {
        type: "approve_once",
        approvedBy: actor,
        decidedAt: decision.decided_at
      };
    case "edit_fields":
      return {
        type: "edit",
        approvedBy: actor,
        decidedAt: decision.decided_at,
        patch:
          decision.edited_fields?.map((field) => ({
            op: "replace",
            path: `/fields/${field.field}`,
            value: field.after
          })) ?? [],
        note: "User chose to edit fields before execution."
      };
    case "take_wheel":
      return {
        type: "takeover",
        operator: actor,
        decidedAt: decision.decided_at,
        resumeMode: "resume_from_current_state"
      };
    case "block":
      return {
        type: "block",
        blockedBy: actor,
        decidedAt: decision.decided_at,
        reason: decision.reason ?? "User blocked the browser action."
      };
    case "create_rule":
      return {
        type: "create_rule",
        approvedBy: actor,
        decidedAt: decision.decided_at,
        rule: {
          id: createId("rule"),
          description: "Rule created from AgentClutch browser overlay.",
          match: {
            actionCardId: decision.action_card_id
          },
          decision: "require_clutch"
        },
        note: "User requested a rule for similar future actions."
      };
    case "request_more_context":
    case "timeout":
      return {
        type: "block",
        blockedBy: actor,
        decidedAt: decision.decided_at,
        reason: `Browser action was not approved: ${decision.decision}.`
      };
  }
}

async function submitElement(locator: Locator): Promise<void> {
  await locator.evaluate((element) => {
    if (element instanceof HTMLFormElement) {
      element.requestSubmit();
      return;
    }

    if (element instanceof HTMLElement) {
      element.click();
      return;
    }

    throw new Error("Selected element cannot be submitted.");
  });
}

function inferKindFromText(text: string): string {
  const lower = text.toLowerCase();

  if (
    lower.includes("checkout") ||
    lower.includes("buy") ||
    lower.includes("purchase")
  ) {
    return "browser.checkout";
  }

  if (lower.includes("submit")) return "browser.form_submit";
  if (lower.includes("send")) return "email.send";
  if (lower.includes("delete") || lower.includes("remove")) return "file.delete";
  if (lower.includes("approve")) return "browser.click";

  return "browser.click";
}

function loopEvent(
  proposal: ActionProposal,
  eventType: "action.proposed" | "resume_context.created",
  payload: unknown
) {
  return {
    type: "agentclutch.loop_event.v0",
    id: createId("evt"),
    loopId: proposal.loopId,
    stepId: proposal.stepId,
    eventType,
    timestamp: new Date().toISOString(),
    payload
  };
}

async function record(
  recorder: AttachClutchOptions["recorder"] | undefined,
  event: unknown
): Promise<void> {
  await recorder?.record(event);
}

function getStringField(
  fields: Record<string, unknown> | undefined,
  key: string
): string | undefined {
  const value = fields?.[key];

  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getBoundingBoxField(
  fields: Record<string, unknown> | undefined,
  key: string
): BoundingBox | undefined {
  const value = fields?.[key];

  if (
    typeof value === "object" &&
    value !== null &&
    "x" in value &&
    "y" in value &&
    "width" in value &&
    "height" in value
  ) {
    const box = value as Record<string, unknown>;

    if (
      typeof box["x"] === "number" &&
      typeof box["y"] === "number" &&
      typeof box["width"] === "number" &&
      typeof box["height"] === "number"
    ) {
      return {
        x: box["x"],
        y: box["y"],
        width: box["width"],
        height: box["height"]
      };
    }
  }

  return undefined;
}

function browserActionMetadata(
  options: BrowserActionOptions
): Record<string, unknown> | undefined {
  const metadata: Record<string, unknown> = {
    ...(options.metadata ?? {})
  };

  if (options.changedFields !== undefined) {
    metadata["changedFields"] = options.changedFields;
  }

  return Object.keys(metadata).length === 0 ? undefined : metadata;
}

function getChangedFields(
  metadata: Record<string, unknown> | undefined
): ChangedField[] | undefined {
  const value = metadata?.["changedFields"];

  if (!Array.isArray(value)) return undefined;

  return value.filter(isChangedField);
}

function isChangedField(value: unknown): value is ChangedField {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)["field"] === "string" &&
    "after" in value
  );
}

function toJsonObject(value: unknown): JsonObject | undefined {
  const jsonValue = toJsonValue(value);

  if (
    jsonValue !== null &&
    typeof jsonValue === "object" &&
    !Array.isArray(jsonValue)
  ) {
    return jsonValue;
  }

  return undefined;
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    const items: JsonValue[] = [];

    for (const item of value) {
      const jsonItem = toJsonValue(item);
      if (jsonItem !== undefined) items.push(jsonItem);
    }

    return items;
  }

  if (typeof value === "object" && value !== null) {
    const object: JsonObject = {};

    for (const [key, item] of Object.entries(value)) {
      const jsonItem = toJsonValue(item);
      if (jsonItem !== undefined) object[key] = jsonItem;
    }

    return object;
  }

  return undefined;
}
